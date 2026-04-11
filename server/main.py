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
# Explicit CORS for browser hits to Flask (e.g. direct :5000 from any localhost dev port)
CORS(
    app,
    resources={r"/api/*": {"origins": "*", "methods": ["GET", "HEAD", "OPTIONS"]}},
    supports_credentials=False,
)

# Initialize Flask-Limiter for 50 requests per minute
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["50 per minute"],
    storage_uri="memory://"
)

FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
API_KEY = os.getenv('FINNHUB_API_KEY')

if not API_KEY:
    print("WARNING: FINNHUB_API_KEY is not set in the .env file.")

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
    port = int(os.environ.get("PORT", 5000))
    print(f"Backend Server running on port {port}")
    print("Rate limits: max 50 requests per minute.")
    # Run the app
    app.run(port=port, debug=True)
