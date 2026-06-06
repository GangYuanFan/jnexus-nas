from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import yfinance as yf
import threading
import time
import os
import pandas as pd

app = Flask(__name__)
CORS(app)
app.json.sort_keys = False

import json

# Mapping categories to tickers (moved to external JSON)
def load_tickers():
    try:
        with open('tickers.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading tickers.json: {e}")
        return {
            "台股": {"台積電": "2330.TW", "元大台灣50": "0050.TW"},
            "美股": {"Apple": "AAPL"},
            "虛擬貨幣": {"Bitcoin": "BTC-USD"}
        }

TICKERS = load_tickers()

# Cache to store data grouped by category
stocks_cache = {}
lock = threading.Lock()

def fetch_prices():
    global stocks_cache
    while True:
        for category, tickers in TICKERS.items():
            category_data = {}
            for name, symbol in tickers.items():
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.fast_info
                    current_price = info['lastPrice']
                    prev_close = info['previousClose']
                    change = current_price - prev_close
                    pct_change = (change / prev_close) * 100 if prev_close else 0

                    category_data[name] = {
                        "symbol": symbol,
                        "price": round(current_price, 2),
                        "change": round(change, 2),
                        "pct_change": round(pct_change, 2),
                        "currency": info['currency'],
                        "last_updated": time.strftime("%H:%M:%S")
                    }
                except Exception as e:
                    print(f"Error fetching {name} ({symbol}): {e}")
            
            with lock:
                stocks_cache[category] = category_data
        
        time.sleep(30)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'cyber_finance_v2.html')

@app.route('/api/stocks')
def get_stocks():
    with lock:
        return jsonify(stocks_cache)

@app.route('/api/search')
def search_stock():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({}), 200
    
    # Try common suffixes for Taiwan and US markets
    suffixes = ['.TW', '']
    for suffix in suffixes:
        symbol = query + suffix
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            if 'lastPrice' in info:
                # Success! Found the stock
                current_price = info['lastPrice']
                prev_close = info['previousClose']
                change = current_price - prev_close
                pct_change = (change / prev_close) * 100 if prev_close else 0
                
                # Try to get a friendly name
                name = symbol.replace('.TW', '')
                try:
                    # Ticker.info is slower but contains the name
                    name = ticker.info.get('shortName', name)
                except:
                    pass

                return jsonify({
                    name: {
                        "symbol": symbol,
                        "price": round(current_price, 2),
                        "change": round(change, 2),
                        "pct_change": round(pct_change, 2),
                        "currency": info['currency'],
                        "last_updated": time.strftime("%H:%M:%S")
                    }
                })
        except Exception:
            continue
            
    return jsonify({"error": "Stock not found"}), 404

@app.route('/api/history/<symbol>')
def get_history(symbol):
    try:
        ticker = yf.Ticker(symbol)
        # Get maximum available history to allow deep zooming
        df = ticker.history(period='max')
        
        if df.empty:
            return jsonify({"error": "No data found"}), 404
            
        # Convert index (datetime) to timestamp and data to list of dicts
        history = []
        for date, row in df.iterrows():
            try:
                history.append({
                    "time": int(date.timestamp()),
                    "open": round(float(row['Open']), 2) if not pd.isna(row['Open']) else 0.0,
                    "high": round(float(row['High']), 2) if not pd.isna(row['High']) else 0.0,
                    "low": round(float(row['Low']), 2) if not pd.isna(row['Low']) else 0.0,
                    "close": round(float(row['Close']), 2) if not pd.isna(row['Close']) else 0.0,
                    "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0
                })
            except Exception as e:
                print(f"Error parsing row {date}: {e}")
                continue
        
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    thread = threading.Thread(target=fetch_prices, daemon=True)
    thread.start()
    app.run(host='0.0.0.0', port=8000, debug=False)
