"""
app.py — EcoTrack Full-Stack Backend
Includes: auth, carbon calculator, activities, tracks, device-usage,
          rewards system (XP, streaks, badges), global leaderboard.
"""
import math, random, uuid
from datetime import datetime, date, timedelta

import psutil
from flask import Flask, jsonify, request
from flask_cors import CORS

from ai_logic import calculate_carbon, generate_ai_insight, get_category, get_suggestions
from auth import (login_user, register_user, get_user_profile,
                  update_user_rewards, get_leaderboard, find_user, load_users)

app = Flask(__name__)
CORS(app)

VALID_USAGE_TYPES = {"gaming", "streaming", "normal"}

# ── In-memory stores ──────────────────────────────────────────────────────────
_activities   = []
_tracks       = []
_device_usage = []

# ── Badge definitions ─────────────────────────────────────────────────────────
BADGES = {
    "first_step":    {"id": "first_step",    "name": "First Step",       "icon": "🌱", "desc": "Logged your first activity"},
    "streak_3":      {"id": "streak_3",      "name": "3-Day Streak",     "icon": "🔥", "desc": "3 consecutive active days"},
    "streak_7":      {"id": "streak_7",      "name": "Week Warrior",     "icon": "⚡", "desc": "7-day activity streak"},
    "streak_30":     {"id": "streak_30",     "name": "Monthly Master",   "icon": "👑", "desc": "30-day activity streak"},
    "carbon_saver":  {"id": "carbon_saver",  "name": "Carbon Saver",     "icon": "♻️", "desc": "Saved 10 kg CO₂"},
    "eco_hero":      {"id": "eco_hero",      "name": "Eco Hero",         "icon": "🌍", "desc": "Saved 50 kg CO₂"},
    "calculator":    {"id": "calculator",    "name": "Analyst",          "icon": "📊", "desc": "Used carbon calculator"},
    "top_3":         {"id": "top_3",         "name": "Top 3 Global",     "icon": "🏆", "desc": "Ranked in global top 3"},
}

XP_RULES = {
    "log_activity":    10,
    "log_vehicle":     15,
    "log_device":      10,
    "use_calculator":  5,
    "daily_streak":    20,   # bonus per day of streak
    "carbon_saved_kg": 2,    # per kg CO2 saved vs baseline
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def json_error(msg, code=400):
    return jsonify({"success": False, "message": msg}), code

def auto_detect_usage():
    cpu = round(psutil.cpu_percent(interval=1), 2)
    if cpu > 70:   usage_type = "gaming"
    elif cpu > 40: usage_type = "streaming"
    else:          usage_type = "normal"
    return {"cpu_usage": cpu, "usage_type": usage_type,
            "screen_time": random.randint(4, 6), "charging_freq": random.randint(1, 3)}

def get_auth_user():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
        if token and token not in ("mock-token", ""):
            return token
    return None

def haversine(a, b):
    R = 6371
    dlat = math.radians(b["lat"] - a["lat"])
    dlon = math.radians(b["lng"] - a["lng"])
    h = math.sin(dlat/2)**2 + math.cos(math.radians(a["lat"])) * math.cos(math.radians(b["lat"])) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(h), math.sqrt(1-h))

def compute_streak_and_award(username, xp=0, carbon_saved=0.0, badge=None):
    """Update streak, XP, badges. Returns updated profile dict."""
    profile = get_user_profile(username)
    if not profile:
        return {}

    today = date.today().isoformat()
    last  = profile.get("last_active", "")
    streak = profile.get("streak", 0)

    if last == today:
        pass  # already counted today
    elif last == (date.today() - timedelta(days=1)).isoformat():
        streak += 1
        xp += XP_RULES["daily_streak"]
    else:
        streak = 1  # reset

    new_badges = []
    if badge:
        new_badges.append(badge)
    # streak badges
    if streak >= 3  and "streak_3"  not in profile.get("badges", []):
        new_badges.append("streak_3")
    if streak >= 7  and "streak_7"  not in profile.get("badges", []):
        new_badges.append("streak_7")
    if streak >= 30 and "streak_30" not in profile.get("badges", []):
        new_badges.append("streak_30")
    # carbon saved badges
    total_saved = profile.get("total_carbon_saved", 0) + carbon_saved
    if total_saved >= 10 and "carbon_saver" not in profile.get("badges", []):
        new_badges.append("carbon_saver")
    if total_saved >= 50 and "eco_hero" not in profile.get("badges", []):
        new_badges.append("eco_hero")

    for b in new_badges:
        update_user_rewards(username, xp_delta=0, badge=b)

    update_user_rewards(username, xp_delta=xp, streak=streak,
                        carbon_saved=carbon_saved, last_active=today)

    # check top-3
    lb = get_leaderboard(3)
    if any(e["username"].strip().lower() == username.strip().lower() for e in lb):
        update_user_rewards(username, badge="top_3")
        if "top_3" not in new_badges:
            new_badges.append("top_3")

    return {
        "xp_earned": xp,
        "streak": streak,
        "new_badges": [BADGES[b] for b in new_badges if b in BADGES],
    }

# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "EcoTrack backend running."})

# ── Carbon Calculator ─────────────────────────────────────────────────────────

@app.route("/register", methods=["POST"])
def b2_register():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    if not username or not password:
        return json_error("Username and password are required.")
    success, message = register_user(username, password)
    return jsonify({"success": success, "message": message}), (201 if success else 409)

@app.route("/login", methods=["POST"])
def b2_login():
    data = request.get_json(silent=True) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", "")).strip()
    if not username or not password:
        return json_error("Username and password are required.")
    success, message = login_user(username, password)
    return jsonify({"success": success, "message": message}), (200 if success else 401)

@app.route("/calculate", methods=["POST"])
def calculate():
    user = get_auth_user()
    data = request.get_json(silent=True) or {}
    mode = str(data.get("mode", "")).strip().lower()
    if mode not in {"auto", "manual"}:
        return json_error("mode must be auto or manual.")
    if mode == "auto":
        d = auto_detect_usage()
        cpu_usage, usage_type, screen_time, charging_freq = d["cpu_usage"], d["usage_type"], d["screen_time"], d["charging_freq"]
    else:
        try:
            screen_time   = float(data.get("screen_time", 0))
            charging_freq = float(data.get("charging_freq", 0))
        except (TypeError, ValueError):
            return json_error("screen_time and charging_freq must be numbers.")
        usage_type = str(data.get("usage_type", "")).strip().lower()
        if usage_type not in VALID_USAGE_TYPES:
            return json_error("usage_type must be gaming, streaming, or normal.")
        if screen_time < 0 or charging_freq < 0:
            return json_error("Values cannot be negative.")
        cpu_usage = None

    carbon_score = calculate_carbon(screen_time, charging_freq, usage_type)
    reward = {}
    if user:
        reward = compute_streak_and_award(user, xp=XP_RULES["use_calculator"],
                                          badge="calculator")
    resp = {
        "mode": mode, "cpu_usage": cpu_usage, "usage_type": usage_type,
        "carbon_score": round(carbon_score, 2), "category": get_category(carbon_score),
        "suggestions": get_suggestions(usage_type, carbon_score),
        "insight": generate_ai_insight(usage_type, carbon_score),
        "screen_time": round(screen_time, 2), "charging_freq": round(charging_freq, 2),
    }
    if reward:
        resp["reward"] = reward
    return jsonify(resp), 200

# ── EcoTrack Auth ─────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def eco_register():
    data     = request.get_json(silent=True) or {}
    email    = str(data.get("email", "")).strip()
    password = str(data.get("password", "")).strip()
    account_type = str(data.get("accountType", "personal")).strip()
    org_name     = str(data.get("orgName", "")).strip()
    if not email or not password:
        return jsonify({"message": "Email and password are required."}), 400
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters."}), 400
    success, message = register_user(email, password)
    if not success:
        return jsonify({"message": message}), 409
    # store extra fields
    users = load_users()
    for u in users:
        if u.get("username", "").strip().lower() == email.strip().lower():
            u["accountType"] = account_type
            u["orgName"]     = org_name
            break
    from auth import save_users
    save_users(users)
    profile = get_user_profile(email)
    return jsonify({"token": email, "user": _build_user(email, profile, account_type)}), 201

@app.route("/api/auth/login", methods=["POST"])
def eco_login():
    data     = request.get_json(silent=True) or {}
    email    = str(data.get("email", "")).strip()
    password = str(data.get("password", "")).strip()
    account_type = str(data.get("accountType", "personal")).strip()
    success, message = login_user(email, password)
    if not success:
        return jsonify({"message": message}), 401
    profile = get_user_profile(email)
    stored_type = profile.get("accountType", account_type) if profile else account_type
    return jsonify({"token": email, "user": _build_user(email, profile, stored_type)}), 200

def _build_user(email, profile, account_type):
    base = {"id": email, "email": email, "accountType": account_type}
    if profile:
        base.update({
            "xp":      profile.get("xp", 0),
            "streak":  profile.get("streak", 0),
            "badges":  profile.get("badges", []),
            "total_carbon_saved": profile.get("total_carbon_saved", 0.0),
        })
    return base

@app.route("/api/user/profile", methods=["GET"])
def eco_profile():
    username = get_auth_user()
    if not username:
        return jsonify({"message": "Unauthorized"}), 401
    profile = get_user_profile(username)
    if not profile:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"user": _build_user(username, profile, profile.get("accountType", "personal"))})

# ── Rewards & Leaderboard ─────────────────────────────────────────────────────

@app.route("/api/rewards/profile", methods=["GET"])
def rewards_profile():
    username = get_auth_user()
    if not username:
        return jsonify({"message": "Unauthorized"}), 401
    profile = get_user_profile(username)
    if not profile:
        return jsonify({"message": "Not found"}), 404
    lb = get_leaderboard()
    my_rank = next((e["rank"] for e in lb if e["username"].strip().lower() == username.strip().lower()), None)
    return jsonify({
        "xp":      profile.get("xp", 0),
        "streak":  profile.get("streak", 0),
        "badges":  [BADGES[b] for b in profile.get("badges", []) if b in BADGES],
        "total_carbon_saved": profile.get("total_carbon_saved", 0.0),
        "rank":    my_rank,
        "level":   _xp_to_level(profile.get("xp", 0)),
    })

@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    top = get_leaderboard(20)
    enriched = []
    for e in top:
        e["level"] = _xp_to_level(e["xp"])
        e["badge_icons"] = [BADGES[b]["icon"] for b in e.get("badges", []) if b in BADGES]
        enriched.append(e)
    return jsonify({"leaderboard": enriched})

def _xp_to_level(xp):
    if xp < 50:   return {"num": 1, "name": "Seedling",    "icon": "🌱"}
    if xp < 150:  return {"num": 2, "name": "Sprout",      "icon": "🌿"}
    if xp < 350:  return {"num": 3, "name": "Sapling",     "icon": "🌲"}
    if xp < 700:  return {"num": 4, "name": "Eco Guard",   "icon": "🛡️"}
    if xp < 1200: return {"num": 5, "name": "Green Hero",  "icon": "⚡"}
    return           {"num": 6, "name": "Earth Champion", "icon": "🏆"}

# ── Activities ────────────────────────────────────────────────────────────────

@app.route("/api/activity", methods=["GET"])
def get_activities():
    user = get_auth_user()
    if not user: return jsonify({"message": "Unauthorized"}), 401
    return jsonify({"activities": [a for a in _activities if a.get("userId") == user]})

@app.route("/api/activity", methods=["POST"])
def create_activity():
    user = get_auth_user()
    if not user: return jsonify({"message": "Unauthorized"}), 401
    data = request.get_json(silent=True) or {}
    act  = {"_id": str(uuid.uuid4()), "userId": user,
            "type": data.get("type", "other"), "value": data.get("value", 0),
            "carbonEmission": data.get("carbonEmission", 0),
            "transportType": data.get("transportType"),
            "date": data.get("date", datetime.utcnow().isoformat())}
    _activities.append(act)
    first = sum(1 for a in _activities if a.get("userId") == user) == 1
    reward = compute_streak_and_award(
        user, xp=XP_RULES["log_activity"],
        carbon_saved=float(data.get("carbonEmission", 0)),
        badge="first_step" if first else None,
    )
    return jsonify({"activity": act, "reward": reward}), 201

# ── Tracks ────────────────────────────────────────────────────────────────────

@app.route("/api/track/start", methods=["POST"])
def start_track():
    user = get_auth_user()
    if not user: return jsonify({"message": "Unauthorized"}), 401
    data  = request.get_json(silent=True) or {}
    track = {"_id": str(uuid.uuid4()), "userId": user,
             "startPoint": data.get("startPoint"),
             "startTime": datetime.utcnow().isoformat(), "status": "active", "points": []}
    _tracks.append(track)
    return jsonify({"trackId": track["_id"]}), 201

@app.route("/api/track/stop", methods=["POST"])
def stop_track():
    user = get_auth_user()
    if not user: return jsonify({"message": "Unauthorized"}), 401
    data   = request.get_json(silent=True) or {}
    points = data.get("points", [])
    track  = next((t for t in _tracks if t["_id"] == data.get("trackId")), None)
    if not track: return jsonify({"message": "Track not found"}), 404
    distance = sum(haversine(points[i-1], points[i]) for i in range(1, len(points))) if len(points) > 1 else 0
    vehicle_factor = float(data.get("vehicleFactor", 0.192))
    carbon = round(distance * vehicle_factor, 3)
    track.update({"points": points, "endTime": datetime.utcnow().isoformat(),
                  "status": "completed", "distance": round(distance, 2),
                  "transportType": data.get("vehicleId", "car"),
                  "carbonEmission": carbon})
    reward = compute_streak_and_award(user, xp=XP_RULES["log_vehicle"], carbon_saved=carbon)
    return jsonify({"track": track, "reward": reward})

@app.route("/api/track/history", methods=["GET"])
def track_history():
    user = get_auth_user()
    if not user: return jsonify({"message": "Unauthorized"}), 401
    return jsonify({"tracks": [t for t in _tracks if t.get("userId") == user and t.get("status") == "completed"]})

# ── Manual Vehicle Entry ──────────────────────────────────────────────────────

@app.route("/api/vehicle/manual", methods=["POST"])
def vehicle_manual():
    user = get_auth_user()
    if not user: return jsonify({"message": "Unauthorized"}), 401
    data           = request.get_json(silent=True) or {}
    distance       = float(data.get("distance", 0))
    vehicle_factor = float(data.get("vehicleFactor", 0.192))
    vehicle_id     = str(data.get("vehicleId", "car_petrol"))
    vehicle_label  = str(data.get("vehicleLabel", "Car"))
    carbon         = round(distance * vehicle_factor, 3)
    entry = {"_id": str(uuid.uuid4()), "userId": user,
             "type": "transport", "value": distance,
             "carbonEmission": carbon, "transportType": vehicle_id,
             "vehicleLabel": vehicle_label,
             "date": data.get("date", datetime.utcnow().isoformat())}
    _activities.append(entry)
    reward = compute_streak_and_award(user, xp=XP_RULES["log_vehicle"], carbon_saved=carbon)
    return jsonify({"activity": entry, "reward": reward, "carbon_kg": carbon}), 201

# ── Device Usage ──────────────────────────────────────────────────────────────

@app.route("/api/device-usage", methods=["POST"])
def post_device_usage():
    user = get_auth_user()
    if not user: return jsonify({"message": "Unauthorized"}), 401
    data    = request.get_json(silent=True) or {}
    dt      = data.get("date")
    seconds = float(data.get("screenTimeSeconds", 0))
    existing = next((u for u in _device_usage if u["userId"] == user and u["date"] == dt), None)
    if existing:
        existing["screenTimeSeconds"] = seconds
    else:
        _device_usage.append({"_id": str(uuid.uuid4()), "userId": user, "date": dt,
                               "screenTimeSeconds": seconds,
                               "energyConsumed": round((seconds/3600)*0.05, 4),
                               "carbonEmission": round((seconds/3600)*0.05*0.82, 4)})
    reward = compute_streak_and_award(user, xp=XP_RULES["log_device"])
    return jsonify({"success": True, "reward": reward})

@app.route("/api/device-usage", methods=["GET"])
def get_device_usage():
    user = get_auth_user()
    if not user: return jsonify({"message": "Unauthorized"}), 401
    return jsonify({"usages": [u for u in _device_usage if u["userId"] == user]})

# ── ECO AI Analysis & Trending Routes ────────────────────────────────────────
# These routes wire the eco_carbon_ai.py module (one directory up) into Flask.
# sys.path is extended so the import resolves correctly from the backend/ folder.

import sys, os as _os
sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

try:
    from eco_carbon_ai import (
        flask_personal_handler,
        flask_trending_handler,
        get_org_trending_solutions,
        analyze_organisation,
    )
    _AI_AVAILABLE = True
except ImportError:
    _AI_AVAILABLE = False

@app.route("/api/analyze/personal", methods=["POST"])
def api_analyze_personal():
    """Full ECO AI personal analysis — screen time, eco score, streak, trending placeholder."""
    if not _AI_AVAILABLE:
        return jsonify({"error": "eco_carbon_ai module not found. Place eco_carbon_ai.py in the project root."}), 503
    data = request.get_json(silent=True) or {}
    result = flask_personal_handler(data)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 200

@app.route("/api/analyze/organisation", methods=["POST"])
def api_analyze_organisation():
    """Full ECO AI organisation analysis."""
    if not _AI_AVAILABLE:
        return jsonify({"error": "eco_carbon_ai module not found."}), 503
    data  = request.get_json(silent=True) or {}
    users = data.get("users", [])
    if not isinstance(users, list) or not users:
        return jsonify({"error": "Provide a non-empty 'users' list."}), 400
    return jsonify(analyze_organisation(users)), 200

@app.route("/api/trending", methods=["POST"])
def api_trending():
    """
    Return personalised trending solutions for personal mode.
    Expected body: { screen_time, usage_type, charging_freq, distance, fuel_type, category? }
    """
    if not _AI_AVAILABLE:
        return jsonify({"error": "eco_carbon_ai module not found."}), 503
    data   = request.get_json(silent=True) or {}
    result = flask_trending_handler(data)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result), 200

@app.route("/api/trending/organisation", methods=["POST"])
def api_trending_org():
    """Return group-level trending solutions for organisation mode."""
    if not _AI_AVAILABLE:
        return jsonify({"error": "eco_carbon_ai module not found."}), 503
    data     = request.get_json(silent=True) or {}
    users    = data.get("users", [])
    org_cat  = str(data.get("org_category", "Medium"))
    result   = get_org_trending_solutions(users, org_cat)
    return jsonify({"mode": "trending_organisation", **result}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)