from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import requests
import os
from dotenv import load_dotenv


def _repo_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _load_env() -> str:
    """Load `.env` from repo root (same FINNHUB_API_KEY as prices). Root wins over existing env."""
    root = _repo_root()
    primary = os.path.join(root, ".env")
    if os.path.isfile(primary):
        load_dotenv(primary, override=True)
    else:
        load_dotenv()
    secondary = os.path.join(root, "server", ".env")
    if os.path.isfile(secondary):
        load_dotenv(secondary, override=False)
    return primary


_ENV_PATH = _load_env()


def finnhub_token() -> str:
    raw = (os.getenv("FINNHUB_API_KEY") or "").strip()
    if raw.startswith("\ufeff"):
        raw = raw.lstrip("\ufeff").strip()
    return raw

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "*", "methods": ["GET", "HEAD", "POST", "OPTIONS"]}},
    supports_credentials=False,
)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["50 per minute"],
    storage_uri="memory://"
)

FINNHUB_BASE_URL = "https://finnhub.io/api/v1"
ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"


def elevenlabs_api_key() -> str:
    return (os.getenv("ELEVENLABS_API_KEY") or "").strip()


def elevenlabs_default_voice_id() -> str:
    return (os.getenv("ELEVENLABS_VOICE_ID") or "").strip()


def elevenlabs_model_id() -> str:
    return (os.getenv("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2").strip()

# macOS Monterey+ often binds AirPlay to :5000; it answers HTTP with 403 — not Flask.
BACKEND_DEFAULT_PORT = 5050


def _listen_port() -> int:
    raw = os.getenv("FLASK_PORT")
    if raw is None or str(raw).strip() == "":
        return BACKEND_DEFAULT_PORT
    try:
        p = int(raw)
    except ValueError:
        return BACKEND_DEFAULT_PORT
    if p == 5000:
        print("WARNING: Port 5000 is used by macOS AirPlay Receiver (HTTP 403). Using 5050. Set FLASK_PORT=5050 in .env.")
        return BACKEND_DEFAULT_PORT
    return p


def _parse_finnhub_json(response: requests.Response):
    try:
        return response.json()
    except ValueError:
        snippet = (response.text or "")[:240].replace("\n", " ")
        raise ValueError(f"Non-JSON response from Finnhub (HTTP {response.status_code}): {snippet}") from None


def _http_error_payload(exc: requests.HTTPError) -> tuple[dict, int]:
    resp = exc.response
    code = resp.status_code if resp is not None else 502
    detail = str(exc)
    if resp is not None:
        try:
            err_body = resp.json()
            if isinstance(err_body, dict) and err_body.get("error"):
                detail = str(err_body["error"])
        except (ValueError, TypeError):
            pass
    out = code if 400 <= code < 600 else 502
    return ({"error": "Finnhub error", "details": detail}, out)


if not finnhub_token():
    print(
        "WARNING: FINNHUB_API_KEY is empty after loading env. "
        f"Expected it in: {_ENV_PATH if os.path.isfile(_ENV_PATH) else '(no .env at repo root — create one or export FINNHUB_API_KEY)'}"
    )
else:
    print(f"Finnhub: FINNHUB_API_KEY loaded ({len(finnhub_token())} chars)")

if not elevenlabs_api_key():
    print("INFO: ELEVENLABS_API_KEY unset — chat Live voice (/api/elevenlabs/tts) will return 503 until set.")


@app.route('/api/stocks/search', methods=['GET'])
def search_stocks():
    token = finnhub_token()
    if not token:
        return jsonify({"error": "FINNHUB_API_KEY is not configured on the server", "result": []}), 503
    q = (request.args.get("q") or "").strip()
    if len(q) < 1:
        return jsonify({"count": 0, "result": []})
    if len(q) > 64:
        q = q[:64]
    try:
        response = requests.get(
            f"{FINNHUB_BASE_URL}/search",
            params={"q": q, "token": token},
            timeout=15,
        )
        response.raise_for_status()
        return jsonify(_parse_finnhub_json(response))
    except requests.HTTPError as e:
        body, code = _http_error_payload(e)
        body["result"] = []
        return jsonify(body), code
    except (requests.RequestException, ValueError) as e:
        return jsonify({"error": "Failed to search symbols", "details": str(e), "result": []}), 500


@app.route('/api/stocks/quote/<symbol>', methods=['GET'])
def get_quote(symbol):
    token = finnhub_token()
    if not token:
        return jsonify({"error": "FINNHUB_API_KEY is not configured on the server"}), 503
    try:
        response = requests.get(
            f"{FINNHUB_BASE_URL}/quote",
            params={"symbol": symbol, "token": token},
            timeout=15,
        )
        response.raise_for_status()
        return jsonify(_parse_finnhub_json(response))
    except requests.HTTPError as e:
        body, code = _http_error_payload(e)
        body["error"] = "Finnhub quote error"
        return jsonify(body), code
    except (requests.RequestException, ValueError) as e:
        return jsonify({"error": "Failed to fetch stock quote", "details": str(e)}), 500


@app.route('/api/stocks/profile/<symbol>', methods=['GET'])
def get_profile(symbol):
    token = finnhub_token()
    if not token:
        return jsonify({"error": "FINNHUB_API_KEY is not configured on the server"}), 503
    try:
        response = requests.get(
            f"{FINNHUB_BASE_URL}/stock/profile2",
            params={"symbol": symbol, "token": token},
            timeout=15,
        )
        response.raise_for_status()
        return jsonify(_parse_finnhub_json(response))
    except requests.HTTPError as e:
        body, code = _http_error_payload(e)
        return jsonify(body), code
    except (requests.RequestException, ValueError) as e:
        return jsonify({"error": "Failed to fetch company profile", "details": str(e)}), 500


NEWS_CATEGORIES = frozenset({"general", "forex", "crypto", "merger"})


def _parse_min_id(raw: str | None) -> int:
    """Finnhub /news minId — only news after this id; default 0."""
    if raw is None or str(raw).strip() == "":
        return 0
    try:
        v = int(str(raw).strip(), 10)
    except ValueError:
        return 0
    if v < 0:
        return 0
    return min(v, 2_000_000_000)


@app.route('/api/stocks/news', methods=['GET'])
def market_news():
    """Proxy Finnhub GET /news (category required; minId optional)."""
    token = finnhub_token()
    if not token:
        return jsonify({"error": "FINNHUB_API_KEY is not configured on the server"}), 503
    raw = (request.args.get("category") or "general").strip().lower()
    category = raw if raw in NEWS_CATEGORIES else "general"
    min_id = _parse_min_id(request.args.get("minId"))
    try:
        response = requests.get(
            f"{FINNHUB_BASE_URL}/news",
            params={"category": category, "minId": min_id, "token": token},
            timeout=15,
        )
        response.raise_for_status()
        data = _parse_finnhub_json(response)
        if not isinstance(data, list):
            return jsonify({"error": "Unexpected Finnhub response", "details": "expected a JSON array"}), 502
        return jsonify(data)
    except requests.HTTPError as e:
        body, code = _http_error_payload(e)
        return jsonify(body), code
    except (requests.RequestException, ValueError) as e:
        return jsonify({"error": "Failed to fetch market news", "details": str(e)}), 500


@app.route("/api/elevenlabs/tts", methods=["POST"])
@limiter.limit("15 per minute")
def elevenlabs_tts():
    """Proxy text-to-speech so the ElevenLabs API key stays on the server. Optional JSON voice_id overrides default."""
    key = elevenlabs_api_key()
    if not key:
        return jsonify({"error": "ELEVENLABS_API_KEY is not configured on the server"}), 503
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    if len(text) > 8000:
        text = text[:8000]
    voice_id = (data.get("voice_id") or "").strip() or elevenlabs_default_voice_id()
    if not voice_id:
        return (
            jsonify(
                {
                    "error": "voice_id is required",
                    "details": "Set ELEVENLABS_VOICE_ID in server .env or pass voice_id in the JSON body (from ElevenLabs Voice Lab).",
                }
            ),
            400,
        )
    url = f"{ELEVENLABS_BASE_URL}/text-to-speech/{voice_id}"
    payload = {"text": text, "model_id": elevenlabs_model_id()}
    try:
        r = requests.post(
            url,
            json=payload,
            headers={"xi-api-key": key, "Accept": "audio/mpeg"},
            timeout=120,
        )
        if not r.ok:
            detail = r.text[:500] if r.text else r.reason
            try:
                err_json = r.json()
                if isinstance(err_json, dict):
                    detail = str(err_json.get("detail") or err_json.get("message") or err_json)[:500]
            except (ValueError, TypeError):
                pass
            return jsonify({"error": "ElevenLabs request failed", "details": detail, "status": r.status_code}), 502
        ct = r.headers.get("Content-Type") or "audio/mpeg"
        return Response(r.content, mimetype=ct, headers={"Cache-Control": "no-store"})
    except requests.RequestException as e:
        return jsonify({"error": "Failed to reach ElevenLabs", "details": str(e)}), 502


if __name__ == '__main__':
    port = _listen_port()
    print(f"Backend: http://127.0.0.1:{port}  (rate limit 50 req/min to this server)")
    app.run(host="127.0.0.1", port=port, debug=True)
