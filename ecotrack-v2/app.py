"""
app.py — ECO AI Flask Backend
Wires eco_carbon_ai.py into REST endpoints consumed by the React frontend.

Run:
    pip install flask flask-cors
    python app.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from eco_carbon_ai import (
    flask_personal_handler,
    flask_organisation_handler,
    flask_trending_handler,
    flask_org_trending_handler,
)

app = Flask(__name__)
CORS(app)

# ── In-memory user store (replace with a real DB in production) ──────────────
import hashlib, uuid, time

USERS = {}   # { email: { password_hash, token, accountType, orgName } }
TOKENS = {}  # { token: email }

def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()
def make_token(): return str(uuid.uuid4())
def get_user_from_request():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '').strip()
    email = TOKENS.get(token)
    return USERS.get(email) if email else None

# ── Auth ─────────────────────────────────────────────────────────────────────
@app.post('/api/auth/register')
def register():
    d = request.get_json() or {}
    email = d.get('email', '').strip().lower()
    password = d.get('password', '')
    account_type = d.get('accountType', 'personal')
    org_name = d.get('orgName', '')
    if not email or not password:
        return jsonify({'message': 'Email and password are required.'}), 400
    if email in USERS:
        return jsonify({'message': 'An account with this email already exists.'}), 409
    token = make_token()
    USERS[email] = {'email': email, 'password_hash': hash_pw(password),
                    'accountType': account_type, 'orgName': org_name, 'token': token}
    TOKENS[token] = email
    return jsonify({'token': token, 'user': {'email': email, 'accountType': account_type, 'orgName': org_name}})

@app.post('/api/auth/login')
def login():
    d = request.get_json() or {}
    email = d.get('email', '').strip().lower()
    password = d.get('password', '')
    user = USERS.get(email)
    if not user or user['password_hash'] != hash_pw(password):
        return jsonify({'message': 'Invalid email or password.'}), 401
    token = make_token()
    user['token'] = token
    TOKENS[token] = email
    return jsonify({'token': token, 'user': {'email': email, 'accountType': user.get('accountType', 'personal')}})

@app.get('/api/user/profile')
def profile():
    user = get_user_from_request()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401
    return jsonify({'user': {'email': user['email'], 'accountType': user.get('accountType', 'personal')}})

# ── ECO AI Analysis ──────────────────────────────────────────────────────────
@app.post('/api/analyze/personal')
def analyze_personal():
    user = get_user_from_request()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.get_json() or {}
    if 'user_id' not in data and user:
        data['user_id'] = user['email']
    result = flask_personal_handler(data)
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.post('/api/analyze/organisation')
def analyze_organisation():
    user = get_user_from_request()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401
    result = flask_organisation_handler(request.get_json() or {})
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.post('/api/trending')
def trending_personal():
    result = flask_trending_handler(request.get_json() or {})
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

@app.post('/api/trending/organisation')
def trending_org():
    result = flask_org_trending_handler(request.get_json() or {})
    if 'error' in result:
        return jsonify(result), 400
    return jsonify(result)

# ── Basic Carbon Calculator (auto CPU mode) ──────────────────────────────────
@app.post('/calculate')
def calculate():
    import psutil
    d = request.get_json() or {}
    mode = d.get('mode', 'manual')
    if mode == 'auto':
        cpu = psutil.cpu_percent(interval=1)
        screen_time   = round(cpu / 20, 1)   # rough estimate
        usage_type    = 'gaming' if cpu > 70 else 'streaming' if cpu > 40 else 'normal'
        charging_freq = 2
    else:
        cpu           = None
        screen_time   = float(d.get('screen_time', 0))
        usage_type    = d.get('usage_type', 'normal')
        charging_freq = int(d.get('charging_freq', 0))

    result = flask_personal_handler({
        'screen_time': screen_time, 'usage_type': usage_type,
        'charging_freq': charging_freq, 'distance': 0, 'fuel_type': 'electric',
    })
    return jsonify({
        'mode': mode, 'cpu_usage': cpu,
        'usage_type': usage_type, 'screen_time': screen_time, 'charging_freq': charging_freq,
        'carbon_score': result.get('device_kg', 0),
        'category': result.get('category', 'Low'),
        'insight': result.get('insight', ''),
        'suggestions': [s['suggestion'] for s in result.get('suggestions', [])[:5]],
    })

# ── Activity log (stub) ──────────────────────────────────────────────────────
ACTIVITIES = {}  # { email: [activity, ...] }

@app.get('/api/activity')
def get_activities():
    user = get_user_from_request()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401
    return jsonify({'activities': ACTIVITIES.get(user['email'], [])})

@app.post('/api/activity')
def post_activity():
    user = get_user_from_request()
    if not user:
        return jsonify({'message': 'Unauthorized'}), 401
    activity = request.get_json() or {}
    activity['id'] = str(uuid.uuid4())
    activity['createdAt'] = time.time()
    ACTIVITIES.setdefault(user['email'], []).append(activity)
    return jsonify({'activity': activity}), 201

# ── Stub routes ──────────────────────────────────────────────────────────────
@app.post('/api/track/start')
@app.post('/api/track/stop')
@app.get('/api/track/history')
@app.post('/api/device-usage')
@app.get('/api/device-usage')
def stub():
    return jsonify({'ok': True, 'data': []})

if __name__ == '__main__':
    print("EC🌍 AI Backend running on http://localhost:5000")
    app.run(debug=True, port=5000)
