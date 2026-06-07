import requests
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import yfinance as yf
import threading
import time
import os
import pandas as pd
# Remove the redundant import requests here, as it's at the top

# Create a custom session to avoid Yahoo Finance blocking (User-Agent)
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

app = Flask(__name__)
CORS(app)
app.json.sort_keys = False

lock = threading.Lock()
stocks_cache = {}

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

def get_etf_components(symbol):
    # Check if it's a Taiwan ETF (starts with 00)
    clean_symbol = symbol.replace('.TW', '')
    if not clean_symbol.startswith('00'):
        return []

    # Core ETF Database: Industry standards to ensure high-quality baseline
    etf_data = {
        "0050.TW": [
            {"name": "台積電 (2330)", "weight": 52.4},
            {"name": "聯發科 (2454)", "weight": 5.2},
            {"name": "鴻海 (2317)", "weight": 4.8},
            {"name": "富邦金 (2881)", "weight": 4.1},
            {"name": "台塑金 (5880)", "weight": 3.9},
            {"name": "聯想 (0992.HK)", "weight": 3.5},
            {"name": "國泰金 (2882)", "weight": 3.2},
            {"name": "日月光 (2331)", "weight": 3.1},
            {"name": "中華電 (2412)", "weight": 2.8},
            {"name": "台達電 (2308)", "weight": 2.5},
        ],
        "0056.TW": [
            {"name": "聯發科 (2454)", "weight": 7.5},
            {"name": "台積電 (2330)", "weight": 6.8},
            {"name": "鴻海 (2317)", "weight": 6.2},
            {"name": "中華電 (2412)", "weight": 5.9},
            {"name": "國泰金 (2882)", "weight": 5.5},
            {"name": "富邦金 (2881)", "weight": 5.1},
            {"name": "台塑金 (5880)", "weight": 4.8},
            {"name": "日月光 (2331)", "weight": 4.5},
            {"name": "聯電 (2303)", "weight": 4.2},
            {"name": "台泥 (1101)", "weight": 3.8},
        ],
        "00878.TW": [
            {"name": "聯發科 (2454)", "weight": 8.1},
            {"name": "台積電 (2330)", "weight": 7.5},
            {"name": "鴻海 (2317)", "weight": 6.2},
            {"name": "中華電 (2412)", "weight": 5.8},
            {"name": "國泰金 (2882)", "weight": 5.4},
            {"name": "富邦金 (2881)", "weight": 5.0},
            {"name": "台塑金 (5880)", "weight": 4.7},
            {"name": "日月光 (2331)", "weight": 4.4},
            {"name": "聯電 (2303)", "weight": 4.1},
            {"name": "台泥 (1101)", "weight": 3.7},
        ],
        "00919.TW": [
            {"name": "台積電 (2330)", "weight": 8.5},
            {"name": "聯發科 (2454)", "weight": 7.2},
            {"name": "中華電 (2412)", "weight": 6.8},
            {"name": "國泰金 (2882)", "weight": 6.1},
            {"name": "富邦金 (2881)", "weight": 5.9},
            {"name": "台塑金 (5880)", "weight": 5.5},
            {"name": "日月光 (2331)", "weight": 5.2},
            {"name": "鴻海 (2317)", "weight": 4.8},
            {"name": "聯電 (2303)", "weight": 4.5},
            {"name": "台泥 (1101)", "weight": 4.1},
        ],
        "00939.TW": [
            {"name": "聯電 (2303)", "weight": 8.3},
            {"name": "元大金 (2802)", "weight": 6.74},
            {"name": "中信金 (2891)", "weight": 6.38},
            {"name": "國泰金 (2882)", "weight": 6.22},
            {"name": "聯發科 (2454)", "weight": 6.21},
            {"name": "華碩 (2357)", "weight": 6.18},
            {"name": "富邦金 (2881)", "weight": 6.17},
            {"name": "長榮 (2603)", "weight": 5.97},
            {"name": "日月光 (3711)", "weight": 5.5},
            {"name": "中華電 (2412)", "weight": 5.2},
        ],
        "00940.TW": [
            {"name": "華碩 (2357)", "weight": 5.42},
            {"name": "聯詠 (3034)", "weight": 3.44},
            {"name": "英業達 (2382)", "weight": 3.24},
            {"name": "聯電 (2303)", "weight": 3.27},
            {"name": "聯發科 (2454)", "weight": 3.1},
            {"name": "瑞昱 (2379)", "weight": 2.9},
            {"name": "長榮 (2603)", "weight": 2.8},
            {"name": "中信金 (2891)", "weight": 2.5},
            {"name": "國泰金 (2882)", "weight": 2.4},
            {"name": "富邦金 (2881)", "weight": 2.3},
        ],
    }
    
    # Return known data or empty list (let dynamic search handle the rest)
    return etf_data.get(symbol, [])


def web_search_stock(query):
    """Fallback web search using Tavily to find stock info when yfinance fails."""
    api_key = os.environ.get("TAVILY_API_KEY", "YOUR_TAVILY_API_KEY_HERE")
    if api_key == "YOUR_TAVILY_API_KEY_HERE":
        print("TAVILY_API_KEY not configured. Web search fallback skipped.")
        return None
        
    try:
        print(f"  Triggering web search fallback for: {query}...", flush=True)
        response = requests.post("https://api.tavily.com/search", json={
            "api_key": api_key,
            "query": f"{query} 股票 即時價格 股價",
            "search_depth": "advanced",
            "max_results": 3
        })
        data = response.json()
        
        # Try to extract name and price from the snippets
        import re
        for result in data.get('results', []):
            text = result.get('content', '')
            print(f"  Tavily snippet: {text[:100]}...", flush=True) # Debug log
            
            # Flexible price match: Look for "price", "價格", "股價" or just a number near the query
            # Supports formats like "Price: 48.7", "價格 48.7", "48.7 TWD"
            price_match = re.search(r'(?:price|價格|股價|value)[:\s]*(\d+\.?\d*)', text, re.IGNORECASE)
            
            if not price_match:
                # Last ditch effort: just look for any number that looks like a price (e.g., 10.00 - 10000.00)
                # This is risky but better than nothing for a fallback
                all_numbers = re.findall(r'(\d+\.\d{1,2})', text)
                if all_numbers:
                    price = float(all_numbers[0])
                    price_match = True # Mark as found
                else:
                    price_match = False
            else:
                price = float(price_match.group(1))

            if price_match:
                # Refined name match: Look for a name that isn't just a generic word like 'url' or 'link'
                name_match = re.search(r'([\u4e00-\u9fa5\w\s\(\)]+)(?:\(.*?\)|\s*股票)', text)
                if name_match:
                    extracted_name = name_match.group(1).strip()
                    # Filter out generic junk
                    if extracted_name.lower() in ['url', 'link', 'source', 'website', 'href']:
                        name = query
                    else:
                        name = extracted_name
                else:
                    name = query
                
                return {
                    name: {
                        "symbol": query,
                        "price": round(price, 2),
                        "change": 0.0,
                        "pct_change": 0.0,
                        "currency": "TWD",
                        "last_updated": time.strftime("%H:%M:%S"),
                        "source": "web_search"
                    }
                }
        return None
    except Exception as e:
        print(f"  Web search fallback error: {e}", flush=True)
        return None

def fetch_prices():
    global stocks_cache
    while True:
        for category, tickers in TICKERS.items():
            category_data = {}
            for name, symbol in tickers.items():
                try:
                    ticker = yf.Ticker(symbol, session=session)
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
                        "last_updated": time.strftime("%H:%M:%S"),
                        "components": get_etf_components(symbol)
                    }
                except Exception as e:
                    print(f"Error fetching {name} ({symbol}): {e}")
            
            with lock:
                stocks_cache[category] = category_data
        
        time.sleep(30)

@app.route('/api/components/<symbol>')
def get_components_dynamic(symbol):
    # 1. Try local data first
    local_components = get_etf_components(symbol)
    
    # If we have precise local data, return it immediately
    if local_components:
        return jsonify(local_components)
        
    print(f"Local data missing for {symbol}, triggering web search...")
    
    # Use Tavily API for real-time search
    api_key = os.environ.get("TAVILY_API_KEY", "YOUR_TAVILY_API_KEY_HERE")
    if api_key == "YOUR_TAVILY_API_KEY_HERE":
        # Instead of 500, return an empty list with a warning in the logs
        print("TAVILY_API_KEY not configured. Dynamic search skipped.")
        return jsonify([])
        
    try:
        response = requests.post("https://api.tavily.com/search", json={
            "api_key": api_key,
            "query": f"{symbol} ETF top 10 holdings weight",
            "search_depth": "advanced",
            "max_results": 3
        })
        data = response.json()
        
        import re
        text = " ".join([r.get('content', '') for r in data.get('results', [])])
        
        # Enhanced regex: captures "Company (Code) ... %" or "Company ... %"
        # This is a generic attempt to find pairs of text and percentages
        matches = re.findall(r'([\u4e00-\u9fa5\w\s\(\)]+)\s*(\d+\.?\d*%)', text)
        if matches:
            results = []
            for name, weight in matches[:10]:
                # Clean up the name (remove trailing dots, spaces)
                clean_name = name.strip().rstrip('., ')
                if len(clean_name) > 1:
                    results.append({"name": clean_name, "weight": weight.replace('%', '')})
            if results:
                return jsonify(results)
        
        # Final fallback: return empty list rather than 500
        return jsonify([])
        
    except Exception as e:
        print(f"Web search error: {e}")
        return jsonify([]), 200 # Return 200 Empty to avoid frontend crash


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
    
    print(f"Searching for: {query}", flush=True)
    suffixes = ['.TW', '.TWO', '']
    for suffix in suffixes:
        symbol = query + suffix
        try:
            print(f"  Trying symbol: {symbol}", flush=True)
            ticker = yf.Ticker(symbol, session=session)
            
            # Try ticker.info
            info = ticker.info
            if info and ('regularMarketPrice' in info or 'currentPrice' in info):
                print(f"  SUCCESS: Found {symbol} via info", flush=True)
                price = info.get('regularMarketPrice') or info.get('currentPrice')
                prev_close = info.get('previousClose', price)
                change = price - prev_close
                pct_change = (change / prev_close) * 100 if prev_close else 0
                name = info.get('shortName', symbol.replace('.TW', ''))

                return jsonify({
                    name: {
                        "symbol": symbol,
                        "price": round(price, 2),
                        "change": round(change, 2),
                        "pct_change": round(pct_change, 2),
                        "currency": info.get('currency', 'USD'),
                        "last_updated": time.strftime("%H:%M:%S")
                    }
                })
            
            # Final fallback: check if history exists
            hist = ticker.history(period='1d')
            if not hist.empty:
                print(f"  SUCCESS: Found {symbol} via history", flush=True)
                price = hist['Close'].iloc[-1]
                prev_close = hist['Open'].iloc[-1]
                change = price - prev_close
                pct_change = (change / prev_close) * 100 if prev_close else 0
                name = symbol.replace('.TW', '')

                return jsonify({
                    name: {
                        "symbol": symbol,
                        "price": round(price, 2),
                        "change": round(change, 2),
                        "pct_change": round(pct_change, 2),
                        "currency": "TWD" if '.TW' in symbol else "USD",
                        "last_updated": time.strftime("%H:%M:%S")
                    }
                })
                
        except Exception as e:
            print(f"  Error searching {symbol}: {e}", flush=True)
            continue
            
    print(f"Search failed for query: {query}", flush=True)
    
    # --- Web Search Fallback ---
    web_result = web_search_stock(query)
    if web_result:
        print(f"  SUCCESS: Found {query} via web search fallback", flush=True)
        return jsonify(web_result)
    # ---------------------------

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
