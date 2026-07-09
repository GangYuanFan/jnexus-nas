import requests
from flask import Flask, jsonify, send_from_directory, request, send_file
from flask_cors import CORS
import yfinance as yf
import threading
import time
import os
import pandas as pd
import json
import urllib.parse
from http import HTTPStatus

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
})

app = Flask(__name__)
CORS(app)
app.json.sort_keys = False

# --- NAS SETTINGS ---
ROOT_DIR = '/home/jerry/workspace'

lock = threading.Lock()
stocks_cache = {}

def load_json(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return {}

TICKERS = load_json('tickers.json')
if not TICKERS:
    TICKERS = {
        "台股": {"台積電": "2330.TW", "元大台灣50": "0050.TW"},
        "美股": {"Apple": "AAPL"},
        "虛擬貨幣": {"Bitcoin": "BTC-USD"}
    }

ETF_DATA = load_json('etf_components.json')

def get_etf_components(symbol):
    return ETF_DATA.get(symbol, [])


def web_search_stock(query):
    api_key = os.environ.get("TAVILY_API_KEY", "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")
    if api_key == "YOUR_TAVILY_API_KEY_HERE":
        print("TAVILY_API_KEY not configured. Web search fallback skipped.")
        return None
        
    try:
        response = requests.post("https://api.tavily.com/search", json={
            "api_key": api_key,
            "query": f"{query} 股票 即時價格 股價",
            "search_depth": "advanced",
            "max_results": 3
        })
        data = response.json()
        import re
        for result in data.get('results', []):
            text = result.get('content', '')
            price_match = re.search(r'(?:price|價格|股價|value)[:\s]*(\d+\.?\d*)', text, re.IGNORECASE)
            if not price_match:
                all_numbers = re.findall(r'(\d+\.\d{1,2})', text)
                if all_numbers:
                    price = float(all_numbers[0])
                    price_match = True
                else:
                    price_match = False
            else:
                price = float(price_match.group(1))

            if price_match:
                name_match = re.search(r'([\u4e00-\u9fa5\w\s\(\)]+)(?:\(.*?\)|\s*股票)', text)
                name = name_match.group(1).strip() if name_match else query
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

# --- STOCK ROUTES ---

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
    if not query: return jsonify({}), 200
    suffixes = ['.TW', '.TWO', '']
    for suffix in suffixes:
        symbol = query + suffix
        try:
            ticker = yf.Ticker(symbol, session=session)
            info = ticker.info
            if info and ('regularMarketPrice' in info or 'currentPrice' in info):
                price = info.get('regularMarketPrice') or info.get('currentPrice')
                prev_close = info.get('previousClose', price)
                change = price - prev_close
                pct_change = (change / prev_close) * 100 if prev_close else 0
                name = info.get('shortName', symbol.replace('.TW', ''))
                return jsonify({name: {"symbol": symbol, "price": round(price, 2), "change": round(change, 2), "pct_change": round(pct_change, 2), "currency": info.get('currency', 'USD'), "last_updated": time.strftime("%H:%M:%S")}})
            hist = ticker.history(period='1d')
            if not hist.empty:
                price = hist['Close'].iloc[-1]
                prev_close = hist['Open'].iloc[-1]
                change = price - prev_close
                pct_change = (change / prev_close) * 100 if prev_close else 0
                name = symbol.replace('.TW', '')
                return jsonify({name: {"symbol": symbol, "price": round(price, 2), "change": round(change, 2), "pct_change": round(pct_change, 2), "currency": "TWD" if '.TW' in symbol else "USD", "last_updated": time.strftime("%H:%M:%S")}})
        except Exception: continue
    web_result = web_search_stock(query)
    if web_result: return jsonify(web_result)
    return jsonify({"error": "Stock not found"}), 404

@app.route('/api/history/<symbol>')
def get_history(symbol):
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period='max')
        if df.empty: return jsonify({"error": "No data found"}), 404
        history = []
        for date, row in df.iterrows():
            history.append({"time": int(date.timestamp()), "open": round(float(row['Open']), 2) if not pd.isna(row['Open']) else 0.0, "high": round(float(row['High']), 2) if not pd.isna(row['High']) else 0.0, "low": round(float(row['Low']), 2) if not pd.isna(row['Low']) else 0.0, "close": round(float(row['Close']), 2) if not pd.isna(row['Close']) else 0.0, "volume": int(row['Volume']) if not pd.isna(row['Volume']) else 0})
        return jsonify(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/components/<symbol>')
def get_components_dynamic(symbol):
    return jsonify(get_etf_components(symbol))

# --- NAS ROUTES ---

@app.route('/nas')
def serve_nas_index():
    return send_from_directory('.', 'index.html')

@app.route('/api/sysinfo')
def system_info():
    import psutil
    cpu_percent = psutil.cpu_percent(interval=0.5)
    cpu_count = psutil.cpu_count()
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    import platform, time as tmod
    boot_time = psutil.boot_time()
    uptime_seconds = tmod.time() - boot_time
    days = int(uptime_seconds // 86400)
    hours = int((uptime_seconds % 86400) // 3600)
    minutes = int((uptime_seconds % 3600) // 60)
    uptime_human = f"{days}d {hours}h {minutes}m"
    return jsonify({
        "cpu_percent": cpu_percent,
        "cpu_count": cpu_count,
        "platform": platform.platform(),
        "hostname": platform.node(),
        "memory": {
            "total_gb": mem.total / 1024**3,
            "used_gb": (mem.total - mem.available) / 1024**3,
            "percent": mem.percent
        },
        "disk": {
            "total_gb": disk.total / 1024**3,
            "used_gb": disk.used / 1024**3,
            "percent": disk.percent
        },
        "uptime_human": uptime_human
    })

@app.route('/api/read')
def read_file():
    rel_path = request.args.get('path', '').lstrip('/')
    full_path = os.path.join(ROOT_DIR, rel_path)
    if not os.path.abspath(full_path).startswith(os.path.abspath(ROOT_DIR)):
        return "Forbidden", 403
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {e}", 500

@app.route('/api/save', methods=['POST'])
def save_file():
    data = request.json
    rel_path = data.get('path', '').lstrip('/')
    content = data.get('content', '')
    full_path = os.path.join(ROOT_DIR, rel_path)
    if not os.path.abspath(full_path).startswith(os.path.abspath(ROOT_DIR)):
        return jsonify({"error": "Forbidden"}), 403
    try:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/mkdir', methods=['POST'])
def make_dir():
    data = request.json
    rel_path = data.get('path', '').lstrip('/')
    dir_name = data.get('name', '').strip()
    if not dir_name: return jsonify({"error": "Name required"}), 400
    full_path = os.path.join(ROOT_DIR, rel_path, dir_name)
    if not os.path.abspath(full_path).startswith(os.path.abspath(ROOT_DIR)):
        return jsonify({"error": "Forbidden"}), 403
    try:
        os.makedirs(full_path, exist_ok=False)
        return jsonify({"success": True})
    except FileExistsError:
        return jsonify({"error": "Folder already exists"}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    rel_path = request.form.get('path', '').lstrip('/')
    file = request.files.get('file')
    if not file: return jsonify({"error": "No file provided"}), 400
    full_path = os.path.join(ROOT_DIR, rel_path, file.filename)
    if not os.path.abspath(full_path).startswith(os.path.abspath(ROOT_DIR)):
        return jsonify({"error": "Forbidden"}), 403
    try:
        file.save(full_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delete', methods=['POST'])
def delete_item():
    data = request.json
    rel_path = data.get('path', '').lstrip('/')
    full_path = os.path.join(ROOT_DIR, rel_path)
    if not os.path.abspath(full_path).startswith(os.path.abspath(ROOT_DIR)):
        return jsonify({"error": "Forbidden"}), 403
    try:
        if os.path.isdir(full_path):
            import shutil
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/rename', methods=['POST'])
def rename_item():
    data = request.json
    old_rel_path = data.get('oldPath', '').lstrip('/')
    new_name = data.get('newName', '').strip()
    if not new_name: return jsonify({"error": "New name required"}), 400
    
    old_full_path = os.path.join(ROOT_DIR, old_rel_path)
    parent_dir = os.path.dirname(old_full_path)
    new_full_path = os.path.join(parent_dir, new_name)
    
    if not os.path.abspath(old_full_path).startswith(os.path.abspath(ROOT_DIR)) or \
       not os.path.abspath(new_full_path).startswith(os.path.abspath(ROOT_DIR)):
        return jsonify({"error": "Forbidden"}), 403
    try:
        os.rename(old_full_path, new_full_path)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/files')
def list_files():
    rel_path = request.args.get('path', '').lstrip('/')
    full_path = os.path.join(ROOT_DIR, rel_path)
    if not os.path.abspath(full_path).startswith(os.path.abspath(ROOT_DIR)):
        return jsonify({"error": "Forbidden"}), 403
    try:
        items = []
        for entry in os.scandir(full_path):
            items.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if not entry.is_dir() else None,
                "mtime": entry.stat().st_mtime
            })
        items.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
        return jsonify(items)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/download')
def download_file():
    rel_path = request.args.get('path', '').lstrip('/')
    full_path = os.path.join(ROOT_DIR, rel_path)
    if not os.path.abspath(full_path).startswith(os.path.abspath(ROOT_DIR)):
        return "Forbidden", 403
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_file(full_path, as_attachment=True)
    return "File Not Found", 404

if __name__ == '__main__':
    thread = threading.Thread(target=fetch_prices, daemon=True)
    thread.start()
    app.run(host='0.0.0.0', port=8000, debug=False)
