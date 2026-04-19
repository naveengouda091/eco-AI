import json
import os

USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")


def load_users():
    if not os.path.exists(USERS_FILE):
        return []
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def save_users(users):
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def find_user(identifier):
    """Find user by username OR email field (both stored as 'username')."""
    users = load_users()
    identifier = identifier.strip().lower()
    return next(
        (u for u in users if u.get("username", "").strip().lower() == identifier),
        None,
    )


def register_user(username, password):
    users = load_users()
    key = username.strip().lower()
    if any(u.get("username", "").strip().lower() == key for u in users):
        return False, "User already exists."
    users.append({
        "username": username.strip(),
        "password": password,
        # Reward fields
        "xp": 0,
        "streak": 0,
        "last_active": "",
        "badges": [],
        "total_carbon_saved": 0.0,
    })
    save_users(users)
    return True, "User registered successfully."


def login_user(username, password):
    user = find_user(username)
    if not user:
        return False, "User not found."
    if user["password"] != password:
        return False, "Invalid password."
    return True, "Login successful."


def get_user_profile(username):
    user = find_user(username)
    if not user:
        return None
    return {k: v for k, v in user.items() if k != "password"}


def update_user_rewards(username, xp_delta=0, streak=None, badge=None, carbon_saved=0.0, last_active=""):
    users = load_users()
    key = username.strip().lower()
    for u in users:
        if u.get("username", "").strip().lower() == key:
            u["xp"] = u.get("xp", 0) + xp_delta
            if streak is not None:
                u["streak"] = streak
            if badge and badge not in u.get("badges", []):
                u.setdefault("badges", []).append(badge)
            u["total_carbon_saved"] = round(u.get("total_carbon_saved", 0.0) + carbon_saved, 4)
            if last_active:
                u["last_active"] = last_active
            break
    save_users(users)


def get_leaderboard(top_n=10):
    users = load_users()
    ranked = sorted(users, key=lambda u: u.get("xp", 0), reverse=True)
    result = []
    for i, u in enumerate(ranked[:top_n], 1):
        result.append({
            "rank": i,
            "username": u["username"],
            "xp": u.get("xp", 0),
            "streak": u.get("streak", 0),
            "badges": u.get("badges", []),
            "total_carbon_saved": u.get("total_carbon_saved", 0.0),
        })
    return result
