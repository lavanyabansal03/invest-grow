from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import requests
import os
from dotenv import load_dotenv

# Load .env file from the root directory
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "*", "methods": ["GET", "HEAD", "OPTIONS"]}},
    supports_credentials=False,
)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["50 per minute"],
    storage_uri="memory://"
)

FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
API_KEY = os.getenv('FINNHUB_API_KEY')

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


if not API_KEY:
    print("WARNING: FINNHUB_API_KEY is not set in the .env file.")


@app.route('/api/stocks/search', methods=['GET'])
def search_stocks():
    if not API_KEY:
        return jsonify({"error": "FINNHUB_API_KEY is not configured on the server", "result": []}), 503
    q = (request.args.get("q") or "").strip()
    if len(q) < 1:
        return jsonify({"count": 0, "result": []})
    if len(q) > 64:
        q = q[:64]
    try:
        response = requests.get(
            f"{FINNHUB_BASE_URL}/search",
            params={"q": q, "token": API_KEY},
            timeout=15,
        )
        response.raise_for_status()
        return jsonify(response.json())
    except requests.RequestException as e:
        return jsonify({"error": "Failed to search symbols", "details": str(e), "result": []}), 500


@app.route('/api/stocks/quote/<symbol>', methods=['GET'])
def get_quote(symbol):
    if not API_KEY:
        return jsonify({"error": "FINNHUB_API_KEY is not configured on the server"}), 503
    try:
        response = requests.get(f"{FINNHUB_BASE_URL}/quote", params={"symbol": symbol, "token": API_KEY})
        response.raise_for_status()
        return jsonify(response.json())
    except requests.RequestException as e:
        return jsonify({"error": "Failed to fetch stock quote", "details": str(e)}), 500


@app.route('/api/stocks/profile/<symbol>', methods=['GET'])
def get_profile(symbol):
    if not API_KEY:
        return jsonify({"error": "FINNHUB_API_KEY is not configured on the server"}), 503
    try:
        response = requests.get(f"{FINNHUB_BASE_URL}/stock/profile2", params={"symbol": symbol, "token": API_KEY})
        response.raise_for_status()
        return jsonify(response.json())
    except requests.RequestException as e:
        return jsonify({"error": "Failed to fetch company profile", "details": str(e)}), 500


if __name__ == '__main__':
    port = _listen_port()
    print(f"Backend: http://127.0.0.1:{port}  (rate limit 50 req/min to this server)")
    app.run(host="127.0.0.1", port=port, debug=True)
