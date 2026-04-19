"""
ECO – AI-Powered Carbon Footprint Tracking & Reduction System
=============================================================
Logic + AI Module  v2.0  (eco_carbon_ai.py)

WHAT'S NEW IN v2.0
──────────────────
• [UPDATED]     Intelligent, adaptive Eco Score with explainability
• [NEW FEATURE] Behavioral Learning Engine  (in-memory history)
• [UPDATED]     Trend-aware Prediction Engine with confidence levels
• [NEW FEATURE] Anomaly Detection
• [UPDATED]     Smart, prioritised, impact-aware Suggestion Engine
• [UPDATED]     Analytical Insight Generation with confidence scoring
• [NEW FEATURE] Streak System  (consecutive improvement tracking)
• [NEW FEATURE] Leaderboard Logic  (organisation mode)
• [UPDATED]     Full explainability on every major output

Supports:
  - Personal mode      : single-user analysis (with optional history)
  - Organisation mode  : multi-user aggregated analysis + leaderboard

Usage (personal – no history):
    from eco_carbon_ai import analyze_personal
    result = analyze_personal(
        screen_time=5, usage_type="gaming",
        charging_freq=3, distance=40, fuel_type="petrol"
    )

Usage (personal – with history for adaptive scoring & streaks):
    from eco_carbon_ai import analyze_personal, USER_HISTORY
    result = analyze_personal(
        screen_time=5, usage_type="gaming",
        charging_freq=3, distance=40, fuel_type="petrol",
        user_id="alice",
        prev_screen_time=3
    )
    # USER_HISTORY["alice"] is updated automatically each call

Usage (organisation):
    from eco_carbon_ai import analyze_organisation
    users = [
        {"user_id": "u1", "screen_time": 5, "usage_type": "gaming",
         "charging_freq": 3, "distance": 40, "fuel_type": "petrol"},
        {"user_id": "u2", "screen_time": 2, "usage_type": "normal",
         "charging_freq": 1, "distance": 10, "fuel_type": "electric"},
    ]
    result = analyze_organisation(users)
"""

from __future__ import annotations
import math
from typing import Optional

# ═══════════════════════════════════════════════════════════════════════════
# 1.  CONSTANTS – emission factors (kg CO₂ per unit)
# ═══════════════════════════════════════════════════════════════════════════

DEVICE_EMISSION_FACTORS: dict[str, float] = {
    "gaming":    0.08,
    "streaming": 0.055,
    "normal":    0.03,
}

CHARGE_EMISSION_PER_EVENT: float = 0.005

TRANSPORT_EMISSION_FACTORS: dict[str, float] = {
    "petrol":   0.21,
    "diesel":   0.17,
    "electric": 0.05,
}

LOW_THRESHOLD: float    = 2.0
MEDIUM_THRESHOLD: float = 6.0
MAX_EMISSION_BASELINE: float = 15.0

# ── [NEW FEATURE] Anomaly thresholds ────────────────────────────────────────
ANOMALY_SCREEN_TIME_H: float = 10.0   # hours
ANOMALY_DISTANCE_KM: float   = 100.0  # km
ANOMALY_CHARGING_FREQ: int   = 5      # charges/day

# ── [NEW FEATURE] In-memory user history store ──────────────────────────────
# Structure:  USER_HISTORY[user_id] = {
#     "emissions":    [float, ...]  ← daily totals, oldest→newest
#     "screen_times": [float, ...]
#     "eco_scores":   [int, ...]
#     "streak":       int
#     "streak_status": str          ← "improving" | "declining" | "stable"
# }
USER_HISTORY: dict[str, dict] = {}
MAX_HISTORY_DAYS: int = 30   # rolling window

# ── [NEW FEATURE v3.0] Trending Solutions Catalogue ─────────────────────────
# Each entry is a real-world sustainability solution.
# Fields:
#   id          – unique slug used for deduplication
#   trigger     – dict of conditions that activate this trend for a user
#                 Keys: fuel_type, distance_gt, screen_time_gt, charging_freq_gt,
#                       usage_type, category  (all optional; AND logic)
#   title       – short solution name
#   trend_msg   – context-aware message shown in the Trending Solutions tab
#   global_stat – supporting real-world statistic for credibility
#   impact      – expected emission reduction estimate
#   difficulty  – "easy" | "medium" | "hard"
#   tags        – list of topic labels (used for org-level grouping)
TRENDING_CATALOGUE: list[dict] = [
    {
        "id":          "ev_switch",
        "trigger":     {"fuel_type": "petrol"},
        "title":       "Switch to an Electric Vehicle",
        "trend_msg":   (
            "Trending solution for users like you: EV adoption is the fastest-growing "
            "sustainability shift globally. Drivers on petrol emit up to 4× more CO₂ "
            "per km than EV users on average grid electricity."
        ),
        "global_stat": "EV sales hit a record 14 million in 2023, cutting ~50 Mt CO₂ globally.",
        "impact":      "Reduces transport emissions by ~76 % (0.21 → 0.05 kg/km).",
        "difficulty":  "hard",
        "tags":        ["transport", "ev", "fuel"],
    },
    {
        "id":          "ev_switch_diesel",
        "trigger":     {"fuel_type": "diesel"},
        "title":       "Switch to an Electric Vehicle (Diesel User)",
        "trend_msg":   (
            "Trending solution for users like you: Diesel vehicles are being phased out "
            "in many cities. Transitioning to an EV or plug-in hybrid is the most "
            "impactful long-term move for diesel drivers."
        ),
        "global_stat": "The EU bans new petrol/diesel car sales from 2035.",
        "impact":      "Reduces transport emissions by ~71 % (0.17 → 0.05 kg/km).",
        "difficulty":  "hard",
        "tags":        ["transport", "ev", "fuel"],
    },
    {
        "id":          "public_transport",
        "trigger":     {"distance_gt": 20},
        "title":       "Use Public Transport or Carpool",
        "trend_msg":   (
            "Trending solution for users like you: Commuters travelling > 20 km/day "
            "are among the fastest adopters of public transit worldwide. A single bus "
            "replaces up to 40 cars on the road."
        ),
        "global_stat": "Public transit use saves 37 Mt CO₂/year in the US alone (APTA, 2023).",
        "impact":      "Saves 30–60 % of commute emissions depending on route and occupancy.",
        "difficulty":  "medium",
        "tags":        ["transport", "public_transit", "carpool"],
    },
    {
        "id":          "wfh_remote",
        "trigger":     {"distance_gt": 30},
        "title":       "Work From Home 2 Days a Week",
        "trend_msg":   (
            "Trending solution for users like you: Remote work is now the #1 "
            "employer-led carbon reduction strategy. Even 2 WFH days/week materially "
            "cuts commute emissions."
        ),
        "global_stat": "WFH reduces commute-related emissions by up to 54 % (IEA, 2023).",
        "impact":      "2 WFH days/week = ~40 % reduction in weekly transport footprint.",
        "difficulty":  "easy",
        "tags":        ["transport", "remote_work"],
    },
    {
        "id":          "screen_time_reduction",
        "trigger":     {"screen_time_gt": 5},
        "title":       "Reduce Daily Screen Time",
        "trend_msg":   (
            "Reducing screen time is a widely adopted approach to lower digital carbon "
            "footprint. Users cutting screen time to under 4 h/day see meaningful "
            "reductions in device-side CO₂ over a month."
        ),
        "global_stat": "Global smartphone usage generates ~3.7 % of total GHG emissions (Greenpeace, 2022).",
        "impact":      "Cutting screen time by 2 h/day saves ~0.11 kg CO₂/day (streaming mode).",
        "difficulty":  "easy",
        "tags":        ["device", "screen_time", "digital"],
    },
    {
        "id":          "gaming_power_mode",
        "trigger":     {"usage_type": "gaming"},
        "title":       "Enable Low-Power / Battery-Saver Mode While Gaming",
        "trend_msg":   (
            "Trending solution for users like you: Gaming on battery-saver or "
            "eco-mode is rapidly gaining traction. Modern devices can cut power draw "
            "by 30–40 % in these modes with minimal performance impact."
        ),
        "global_stat": "The global gaming industry consumes ~75 TWh/year — comparable to a small country.",
        "impact":      "Battery-saver mode reduces gaming emissions by ~35 %.",
        "difficulty":  "easy",
        "tags":        ["device", "gaming", "power_mode"],
    },
    {
        "id":          "charging_optimisation",
        "trigger":     {"charging_freq_gt": 2},
        "title":       "Optimise Your Charging Habits",
        "trend_msg":   (
            "Optimised charging (20–80 % rule, once daily) is one of the most "
            "widely recommended digital sustainability habits. It reduces phantom "
            "draw and extends battery lifespan, cutting long-term e-waste."
        ),
        "global_stat": "E-waste is the fastest-growing waste stream — 53.6 Mt in 2023 (UN).",
        "impact":      "Reduces charging emissions by up to 60 % and extends battery life by 2×.",
        "difficulty":  "easy",
        "tags":        ["device", "charging", "battery"],
    },
    {
        "id":          "renewable_energy",
        "trigger":     {"category": "High"},
        "title":       "Switch to a Renewable Energy Tariff",
        "trend_msg":   (
            "Trending solution for high-emission users: Switching your home/office "
            "electricity to a certified renewable tariff is the highest-leverage "
            "systemic change for device and EV users."
        ),
        "global_stat": "Renewable energy now supplies 30 % of global electricity (IEA, 2024).",
        "impact":      "Can reduce device and EV charging emissions by up to 90 % depending on grid mix.",
        "difficulty":  "medium",
        "tags":        ["energy", "renewable", "systemic"],
    },
    {
        "id":          "carbon_offset",
        "trigger":     {"category": "High"},
        "title":       "Offset Unavoidable Emissions via Verified Programmes",
        "trend_msg":   (
            "Carbon offsetting through certified programmes (Gold Standard, Verra VCS) "
            "is increasingly adopted by individuals and teams who cannot yet eliminate "
            "all emissions but want to be net-zero today."
        ),
        "global_stat": "The voluntary carbon market is projected to reach $50 B by 2030 (McKinsey).",
        "impact":      "Neutralises residual emissions while longer-term changes are implemented.",
        "difficulty":  "easy",
        "tags":        ["offset", "systemic", "net_zero"],
    },
    {
        "id":          "plant_based_diet",
        "trigger":     {},    # universal — shown to all users as a general trend
        "title":       "Adopt a More Plant-Based Diet",
        "trend_msg":   (
            "While outside today's tracked activities, diet is the third-largest "
            "personal emission source. Shifting one meal/day to plant-based is a "
            "globally trending lifestyle change with measurable carbon impact."
        ),
        "global_stat": "Food systems account for 26 % of global GHG emissions (Our World in Data).",
        "impact":      "Reducing meat consumption by 50 % saves ~0.5 kg CO₂/day on average.",
        "difficulty":  "medium",
        "tags":        ["lifestyle", "diet", "universal"],
    },
]


# ═══════════════════════════════════════════════════════════════════════════
# 2.  CARBON CALCULATION  (unchanged API)
# ═══════════════════════════════════════════════════════════════════════════

def calculate_device_emissions(
    screen_time: float,
    usage_type: str,
    charging_freq: int,
) -> float:
    """Return kg CO₂ from device usage."""
    factor = DEVICE_EMISSION_FACTORS.get(usage_type.lower(), 0.03)
    return round(screen_time * factor + charging_freq * CHARGE_EMISSION_PER_EVENT, 4)


def calculate_transport_emissions(distance: float, fuel_type: str) -> float:
    """Return kg CO₂ from transportation."""
    factor = TRANSPORT_EMISSION_FACTORS.get(fuel_type.lower(), 0.21)
    return round(distance * factor, 4)


def calculate_total_emissions(device: float, transport: float) -> float:
    return round(device + transport, 4)


# ═══════════════════════════════════════════════════════════════════════════
# 3.  CATEGORISATION  (unchanged)
# ═══════════════════════════════════════════════════════════════════════════

def categorize_emissions(total: float) -> str:
    if total <= LOW_THRESHOLD:
        return "Low"
    elif total <= MEDIUM_THRESHOLD:
        return "Medium"
    return "High"


# ═══════════════════════════════════════════════════════════════════════════
# 4.  ECO SCORE  [UPDATED] — adaptive, weighted, explainable
# ═══════════════════════════════════════════════════════════════════════════

def calculate_eco_score(
    total: float,
    device: float = 0.0,
    transport: float = 0.0,
    history: Optional[dict] = None,
) -> tuple[int, str]:
    """
    [UPDATED] Dynamic eco score using weighted logic across four pillars.

    Pillars and weights
    ───────────────────
    P1  Absolute emissions level          40 pts
    P2  Dominant source balance penalty   20 pts
    P3  Historical trend bonus/penalty    25 pts
    P4  Usage efficiency bonus            15 pts

    Returns
    -------
    (score: int, reason: str)
    """
    # ── P1: Absolute emission level (0–40 pts) ────────────────────────────
    p1 = round(max(0.0, 1.0 - total / MAX_EMISSION_BASELINE) * 40)

    # ── P2: Source balance (0–20 pts) ────────────────────────────────────
    # Rewards balance; penalises extreme skew to one source
    total_safe = max(device + transport, 1e-9)
    dom_ratio  = max(device, transport) / total_safe   # 0.5 (balanced) → 1.0 (all one)
    p2_raw     = 1.0 - (dom_ratio - 0.5) / 0.5        # 1.0 at balance, 0.0 at extreme
    p2         = round(max(0.0, p2_raw) * 20)

    # ── P3: Historical trend (0–25 pts) ──────────────────────────────────
    p3           = 12  # neutral baseline when no history
    trend_reason = "no historical data available (neutral 12/25)"

    if history and len(history.get("emissions", [])) >= 2:
        recent   = history["emissions"][-5:]
        diffs    = [recent[i] - recent[i - 1] for i in range(1, len(recent))]
        avg_diff = sum(diffs) / len(diffs)

        if avg_diff < -0.2:
            p3, trend_reason = 25, f"emissions trending DOWN avg {avg_diff:+.2f} kg/day → full bonus"
        elif avg_diff < 0:
            p3, trend_reason = 18, f"emissions slightly improving ({avg_diff:+.2f} kg/day)"
        elif avg_diff < 0.2:
            p3, trend_reason = 12, f"emissions stable ({avg_diff:+.2f} kg/day)"
        elif avg_diff < 0.5:
            p3, trend_reason = 6,  f"emissions trending UP ({avg_diff:+.2f} kg/day) → penalty"
        else:
            p3, trend_reason = 0,  f"emissions rising sharply ({avg_diff:+.2f} kg/day) → max penalty"

    # ── P4: Usage efficiency bonus (0–15 pts) ────────────────────────────
    p4, efficiency_notes = 0, []
    if total <= LOW_THRESHOLD:
        p4 += 8
        efficiency_notes.append("total in Low tier (+8)")
    if transport < device and total < MEDIUM_THRESHOLD:
        p4 += 4
        efficiency_notes.append("transport below device footprint (+4)")
    if total < 1.0:
        p4 += 3
        efficiency_notes.append("total under 1 kg CO₂ (+3)")
    p4 = min(p4, 15)

    # ── Aggregate ─────────────────────────────────────────────────────────
    score  = min(100, max(0, p1 + p2 + p3 + p4))
    reason = (
        f"Score {score}/100 — "
        f"Emission level: {p1}/40 | "
        f"Source balance: {p2}/20 | "
        f"Trend ({trend_reason}): {p3}/25 | "
        f"Efficiency: {p4}/15"
        + (f" [{', '.join(efficiency_notes)}]" if efficiency_notes else "")
    )
    return score, reason


# ═══════════════════════════════════════════════════════════════════════════
# 5.  BREAKDOWN  (unchanged)
# ═══════════════════════════════════════════════════════════════════════════

def calculate_breakdown(device: float, transport: float) -> dict[str, float]:
    total = device + transport
    if total == 0:
        return {"device_pct": 0.0, "transport_pct": 0.0}
    return {
        "device_pct":    round(device    / total * 100, 1),
        "transport_pct": round(transport / total * 100, 1),
    }


# ═══════════════════════════════════════════════════════════════════════════
# 5b. TEMPORAL TREND ANALYSIS  (unchanged API)
# ═══════════════════════════════════════════════════════════════════════════

def _screen_time_trend(
    screen_time: float,
    prev_screen_time: Optional[float],
) -> dict:
    if prev_screen_time is None:
        return {"available": False}

    delta_h   = round(screen_time - prev_screen_time, 2)
    delta_pct = round(delta_h / prev_screen_time * 100, 1) if prev_screen_time > 0 else 0.0

    if delta_h > 0:
        direction, emoji = "increased", "📈"
        label = (
            f"Screen time increased by {delta_h}h ({delta_pct}%) "
            f"vs yesterday ({prev_screen_time}h → {screen_time}h)."
        )
    elif delta_h < 0:
        direction, emoji = "decreased", "📉"
        label = (
            f"Good improvement: screen time reduced by {abs(delta_h)}h "
            f"({abs(delta_pct)}%) from yesterday ({prev_screen_time}h → {screen_time}h)."
        )
    else:
        direction, emoji = "unchanged", "➡️"
        label = f"Screen time is unchanged from yesterday ({screen_time}h)."

    return {
        "available": True, "direction": direction,
        "delta_h": delta_h, "delta_pct": delta_pct,
        "label": label, "emoji": emoji,
    }


# ═══════════════════════════════════════════════════════════════════════════
# 5c. [NEW FEATURE] BEHAVIORAL LEARNING ENGINE
# ═══════════════════════════════════════════════════════════════════════════

def _update_history(
    user_id: str,
    total: float,
    screen_time: float,
    eco_score: int,
) -> dict:
    """
    [NEW FEATURE] Append today's values to the in-memory history for user_id.
    Maintains a rolling window of MAX_HISTORY_DAYS days.
    Returns the updated history dict.
    """
    if user_id not in USER_HISTORY:
        USER_HISTORY[user_id] = {
            "emissions":     [],
            "screen_times":  [],
            "eco_scores":    [],
            "streak":        0,
            "streak_status": "stable",
        }
    h = USER_HISTORY[user_id]
    h["emissions"].append(total)
    h["screen_times"].append(screen_time)
    h["eco_scores"].append(eco_score)
    for key in ("emissions", "screen_times", "eco_scores"):
        if len(h[key]) > MAX_HISTORY_DAYS:
            h[key] = h[key][-MAX_HISTORY_DAYS:]
    return h


def _build_behavior_pattern(history: dict) -> dict:
    """
    [NEW FEATURE] Derive multi-day behavioral pattern metrics from stored history.

    Returns
    -------
    dict with: avg_screen_time, avg_emission, trend_type, usage_category, data_days
    """
    emissions   = history.get("emissions",    [])
    screen_times = history.get("screen_times", [])

    if not emissions:
        return {
            "avg_screen_time": None, "avg_emission": None,
            "trend_type": "unknown", "usage_category": "unknown", "data_days": 0,
        }

    avg_screen = round(sum(screen_times) / len(screen_times), 2)
    avg_emit   = round(sum(emissions)    / len(emissions),    4)

    # Trend type: mean of last 5 day-over-day deltas
    recent = emissions[-6:]
    if len(recent) >= 2:
        diffs    = [recent[i] - recent[i - 1] for i in range(1, len(recent))]
        avg_diff = sum(diffs) / len(diffs)
        if avg_diff < -0.3:
            trend_type = "consistently_improving"
        elif avg_diff < 0:
            trend_type = "slightly_improving"
        elif avg_diff < 0.3:
            trend_type = "stable"
        elif avg_diff < 0.6:
            trend_type = "slightly_worsening"
        else:
            trend_type = "consistently_worsening"
    else:
        trend_type = "insufficient_data"

    usage_cat = (
        "low_usage"      if avg_screen < 3 else
        "moderate_usage" if avg_screen < 6 else
        "heavy_usage"
    )

    return {
        "avg_screen_time": avg_screen,
        "avg_emission":    avg_emit,
        "trend_type":      trend_type,
        "usage_category":  usage_cat,
        "data_days":       len(emissions),
    }


# ═══════════════════════════════════════════════════════════════════════════
# 5d. [NEW FEATURE] STREAK SYSTEM
# ═══════════════════════════════════════════════════════════════════════════

def _update_streak(history: dict, total: float) -> dict:
    """
    [NEW FEATURE] Track consecutive days where emissions improved or declined.

    Returns
    -------
    dict with: current_streak (int), status (str), message (str)
    """
    emissions = history.get("emissions", [])

    if len(emissions) < 2:
        history["streak"]        = 0
        history["streak_status"] = "stable"
    else:
        prev = emissions[-2]   # day before today (today already appended)
        if total < prev - 0.05:
            if history["streak_status"] == "improving":
                history["streak"] += 1
            else:
                history["streak"]        = 1
                history["streak_status"] = "improving"
        elif total > prev + 0.05:
            if history["streak_status"] == "declining":
                history["streak"] += 1
            else:
                history["streak"]        = 1
                history["streak_status"] = "declining"
        else:
            history["streak"]        = 0
            history["streak_status"] = "stable"

    streak, status = history["streak"], history["streak_status"]
    if status == "improving" and streak > 1:
        message = f"🔥 {streak}-day improvement streak! Keep it up!"
    elif status == "declining" and streak > 1:
        message = f"⚠️ Emissions have been rising for {streak} day(s). Time to act."
    else:
        message = "No active streak today."

    return {"current_streak": streak, "status": status, "message": message}


# ═══════════════════════════════════════════════════════════════════════════
# 5e. [NEW FEATURE] ANOMALY DETECTION
# ═══════════════════════════════════════════════════════════════════════════

def detect_anomalies(
    screen_time: float,
    charging_freq: int,
    distance: float,
    history: Optional[dict] = None,
) -> list[dict]:
    """
    [NEW FEATURE] Detect unusually high activity values using rule-based
    and statistical (z-score) methods.

    Each anomaly dict contains:
        field, value, threshold, severity ("high"|"medium"), message
    """
    anomalies: list[dict] = []

    # ── Rule-based threshold checks ───────────────────────────────────────
    if screen_time > ANOMALY_SCREEN_TIME_H:
        anomalies.append({
            "field": "screen_time", "value": screen_time,
            "threshold": ANOMALY_SCREEN_TIME_H, "severity": "high",
            "message": (
                f"🚨 Screen time of {screen_time}h is extremely high "
                f"(threshold: {ANOMALY_SCREEN_TIME_H}h). Significant device emission spike."
            ),
        })

    if distance > ANOMALY_DISTANCE_KM:
        anomalies.append({
            "field": "distance", "value": distance,
            "threshold": ANOMALY_DISTANCE_KM, "severity": "high",
            "message": (
                f"🚨 Travel distance of {distance} km far exceeds normal "
                f"(threshold: {ANOMALY_DISTANCE_KM} km). Consider rail or virtual meeting."
            ),
        })

    if charging_freq > ANOMALY_CHARGING_FREQ:
        anomalies.append({
            "field": "charging_freq", "value": charging_freq,
            "threshold": ANOMALY_CHARGING_FREQ, "severity": "medium",
            "message": (
                f"⚠️ Charging {charging_freq}x/day is unusually high "
                f"(threshold: {ANOMALY_CHARGING_FREQ}x). Check battery health."
            ),
        })

    # ── Statistical z-score anomaly from history ──────────────────────────
    if history:
        emissions = history.get("emissions", [])
        if len(emissions) >= 5:
            avg = sum(emissions) / len(emissions)
            std = math.sqrt(sum((e - avg) ** 2 for e in emissions) / len(emissions))
            latest = emissions[-1]
            if std > 0 and (latest - avg) / std > 2.0:
                anomalies.append({
                    "field": "total_emission", "value": latest,
                    "threshold": round(avg + 2 * std, 3), "severity": "medium",
                    "message": (
                        f"📊 Today's emission ({latest} kg) is >2σ above your "
                        f"{len(emissions)}-day average ({avg:.3f} ± {std:.3f} kg). "
                        "Statistical outlier detected."
                    ),
                })

    return anomalies


# ═══════════════════════════════════════════════════════════════════════════
# 6.  SUGGESTION ENGINE  [UPDATED] — smart, prioritised, impact-aware
# ═══════════════════════════════════════════════════════════════════════════

def generate_suggestions(
    device: float,
    transport: float,
    screen_time: float,
    usage_type: str,
    charging_freq: int,
    distance: float,
    fuel_type: str,
    trend: Optional[dict] = None,
    anomalies: Optional[list] = None,
    behavior_pattern: Optional[dict] = None,
) -> list[dict]:
    """
    [UPDATED] Returns prioritised, data-driven suggestions with impact estimates.

    Each suggestion is a dict:
    {
        "priority":        int   ← 1 = most urgent
        "category":        str   ← "transport" | "device" | "habit" | "anomaly"
        "suggestion":      str
        "impact_estimate": str   ← quantified saving estimate
        "rationale":       str   ← why this was raised
    }
    Sorted ascending by priority (most impactful first).
    """
    sugg: list[dict] = []
    p = 1  # priority counter

    total            = max(device + transport, 1e-9)
    transport_dom    = transport >= device
    transport_pct    = round(transport / total * 100)
    device_pct       = round(device    / total * 100)

    # ── Priority 0: Anomaly-triggered (always first) ──────────────────────
    if anomalies:
        for a in anomalies:
            if a["field"] == "screen_time":
                sugg.append({
                    "priority": p, "category": "anomaly",
                    "suggestion": (
                        f"🚨 Screen time ({screen_time}h) is abnormally high. "
                        "Enable greyscale mode and set a strict 2-hour app limit immediately."
                    ),
                    "impact_estimate": "Halving screen time cuts device emissions by ~50%.",
                    "rationale": f"Exceeds anomaly threshold of {ANOMALY_SCREEN_TIME_H}h.",
                }); p += 1
            if a["field"] == "distance":
                sugg.append({
                    "priority": p, "category": "anomaly",
                    "suggestion": (
                        f"🚨 Travel distance ({distance} km) is an outlier. "
                        "Consolidate remaining trips this week; use rail for long routes."
                    ),
                    "impact_estimate": "Rail vs petrol saves ~65% transport emissions per km.",
                    "rationale": f"Exceeds anomaly threshold of {ANOMALY_DISTANCE_KM} km.",
                }); p += 1

    # ── Priority 1: Dominant source — Transport ───────────────────────────
    if transport_dom and transport > 0:
        if fuel_type.lower() == "petrol":
            ev_saving = round(distance * (0.21 - 0.05), 3)
            sugg.append({
                "priority": p, "category": "transport",
                "suggestion": (
                    f"🚗 Transport accounts for {transport_pct}% of your footprint. "
                    "Switching to an EV is the single highest-impact change you can make."
                ),
                "impact_estimate": (
                    f"EV switch saves ~{ev_saving} kg CO₂/day "
                    f"(~{round(ev_saving * 30, 1)} kg/month) at {distance} km/day."
                ),
                "rationale": (
                    f"Petrol emits 0.21 kg/km; electric 0.05 kg/km. "
                    f"Your {distance} km trip on petrol = {transport:.3f} kg vs "
                    f"{round(distance * 0.05, 3)} kg on electric."
                ),
            }); p += 1

        elif fuel_type.lower() == "diesel":
            sugg.append({
                "priority": p, "category": "transport",
                "suggestion": (
                    "🚌 Diesel emits high NOₓ and CO₂. "
                    "Carpooling or public transit 3 days/week is a strong first step."
                ),
                "impact_estimate": f"3-day carpool saves ~{round(transport * 0.43 * 3, 2)} kg CO₂/week.",
                "rationale": f"You emit {transport:.3f} kg CO₂ on diesel today.",
            }); p += 1

        if distance > 30:
            sugg.append({
                "priority": p, "category": "transport",
                "suggestion": (
                    f"🛴 You covered {distance} km today. "
                    "Two remote-work days/week cuts weekly distance by 40%."
                ),
                "impact_estimate": (
                    f"2 WFH days/week saves ~{round(distance * 0.21 * 2 * 4, 1)} kg CO₂/month."
                ),
                "rationale": "Reduced commute days have a compounding weekly and monthly impact.",
            }); p += 1

        if distance <= 10 and fuel_type.lower() != "electric":
            sugg.append({
                "priority": p, "category": "transport",
                "suggestion": "🚲 Trips under 10 km are ideal for cycling — zero emissions, free.",
                "impact_estimate": f"Cycling today's trip saves {transport:.3f} kg CO₂.",
                "rationale": "Short motorised trips have poor fuel efficiency per km.",
            }); p += 1

    # ── Priority 2: Dominant source — Device ──────────────────────────────
    if not transport_dom and device > 0:
        if usage_type.lower() == "gaming" and screen_time > 2:
            daily_saving = round(0.5 * 0.08, 3)
            sugg.append({
                "priority": p, "category": "device",
                "suggestion": (
                    f"🎮 Device usage is {device_pct}% of your footprint. "
                    "Gaming is the most power-hungry mode — "
                    "enable battery-saver or cut sessions by 30 min."
                ),
                "impact_estimate": (
                    f"30 min less gaming saves ~{daily_saving} kg CO₂/day "
                    f"(~{round(daily_saving * 30, 2)} kg/month)."
                ),
                "rationale": "Gaming emits 0.08 kg CO₂/h vs 0.03 kg/h for normal use.",
            }); p += 1

        if usage_type.lower() == "streaming" and screen_time > 3:
            sugg.append({
                "priority": p, "category": "device",
                "suggestion": (
                    "📺 Lower streaming resolution to 720p — "
                    "or download on Wi-Fi to reduce live data-centre load."
                ),
                "impact_estimate": "4K→720p cuts video stream energy use by ~86%.",
                "rationale": "Higher resolutions require exponentially more server processing.",
            }); p += 1

        if screen_time > 6:
            saving = round((screen_time - 4) * DEVICE_EMISSION_FACTORS.get(usage_type.lower(), 0.055), 3)
            sugg.append({
                "priority": p, "category": "device",
                "suggestion": (
                    f"📱 {screen_time}h of screen time exceeds the healthy threshold. "
                    "Set a 4-hour daily limit — benefits both planet and wellbeing."
                ),
                "impact_estimate": f"Cutting to 4h saves ~{saving} kg CO₂/day.",
                "rationale": "Screen time over 6h linearly increases device energy demand.",
            }); p += 1

    # ── Priority 3: Charging frequency ───────────────────────────────────
    if charging_freq > 2:
        sugg.append({
            "priority": p, "category": "device",
            "suggestion": (
                f"🔋 {charging_freq} charges/day is excessive. "
                "Aim for 1 full charge; keep battery between 20–80% to extend lifespan."
            ),
            "impact_estimate": (
                f"Reducing to 1 charge/day saves "
                f"~{round((charging_freq - 1) * 0.005 * 30, 3)} kg CO₂/month."
            ),
            "rationale": "Each extra charge cycle adds 0.005 kg CO₂ and degrades battery.",
        }); p += 1

    # ── Priority 4: Temporal trend ────────────────────────────────────────
    if trend and trend.get("available"):
        if trend["direction"] == "increased" and trend["delta_h"] >= 1:
            sugg.append({
                "priority": p, "category": "habit",
                "suggestion": (
                    f"📈 Screen time rose by {trend['delta_h']}h vs yesterday. "
                    "Use app timers or greyscale to break the upward pattern today."
                ),
                "impact_estimate": (
                    f"Reversing trend saves "
                    f"~{round(trend['delta_h'] * DEVICE_EMISSION_FACTORS.get('streaming', 0.055), 3)} "
                    "kg CO₂/day."
                ),
                "rationale": "Day-over-day increases compound into significant weekly emissions.",
            }); p += 1
        elif trend["direction"] == "decreased":
            sugg.append({
                "priority": p, "category": "habit",
                "suggestion": (
                    f"📉 You cut screen time by {abs(trend['delta_h'])}h vs yesterday — "
                    "great habit! Lock this in as your new baseline."
                ),
                "impact_estimate": (
                    f"Sustaining this saves "
                    f"~{round(abs(trend['delta_h']) * 0.055 * 7, 3)} kg CO₂/week."
                ),
                "rationale": "Consistent daily reduction compounds into significant monthly savings.",
            }); p += 1

    # ── Priority 5: Multi-day behaviour pattern ───────────────────────────
    if behavior_pattern and behavior_pattern.get("data_days", 0) >= 3:
        if behavior_pattern["trend_type"] in ("consistently_worsening", "slightly_worsening"):
            sugg.append({
                "priority": p, "category": "habit",
                "suggestion": (
                    f"📊 Your {behavior_pattern['data_days']}-day average is "
                    f"{behavior_pattern['avg_emission']} kg CO₂/day with a worsening trend. "
                    "Set a 10% weekly reduction goal."
                ),
                "impact_estimate": (
                    f"10% reduction = "
                    f"{round(behavior_pattern['avg_emission'] * 0.1, 3)} kg CO₂/day saved."
                ),
                "rationale": f"Trend type: {behavior_pattern['trend_type'].replace('_', ' ')}.",
            }); p += 1

    # ── Priority 6: Universal habit tip (always last) ─────────────────────
    sugg.append({
        "priority": p, "category": "habit",
        "suggestion": (
            "🌱 Log your daily emissions for 7 days — "
            "awareness alone reduces footprint by ~8%."
        ),
        "impact_estimate": (
            f"~{round((device + transport) * 0.08, 3)} kg CO₂/day saved through mindful tracking."
        ),
        "rationale": (
            "Behavioural science: self-monitoring is one of the most effective habit-change tools."
        ),
    })

    sugg.sort(key=lambda x: x["priority"])
    return sugg


# ═══════════════════════════════════════════════════════════════════════════
# 7.  INSIGHT GENERATION  [UPDATED] — analytical, multi-factor, with confidence
# ═══════════════════════════════════════════════════════════════════════════

def generate_insight(
    device: float,
    transport: float,
    category: str,
    eco_score: int,
    behavior_pattern: Optional[dict] = None,
    anomalies: Optional[list] = None,
) -> tuple[str, float]:
    """
    [UPDATED] Returns (insight_text, insight_confidence).

    Confidence reflects evidence quality:
      0.40 — no history
      0.65 — trend available
      0.85 — trend + behavior pattern
      1.00 — all signals including anomaly context
    """
    total      = max(device + transport, 1e-9)
    dominant   = "transportation" if transport >= device else "device usage"
    dom_val    = max(device, transport)
    dom_pct    = round(dom_val / total * 100)
    opp_src    = "device usage" if dominant == "transportation" else "transportation"
    opp_val    = round(min(device, transport), 3)
    confidence = 0.40

    # Base analytical layer
    insight = (
        f"{dominant.capitalize()} drives {dom_pct}% of your daily footprint "
        f"({dom_val:.3f} kg CO₂); {opp_src} adds {opp_val} kg CO₂. "
        f"Category: {category} | Eco score: {eco_score}/100. "
    )

    # Behavioural interpretation layer
    if behavior_pattern and behavior_pattern.get("data_days", 0) >= 3:
        confidence = 0.85
        trend_msg  = behavior_pattern["trend_type"].replace("_", " ")
        insight += (
            f"Over {behavior_pattern['data_days']} tracked days your emissions have been "
            f"'{trend_msg}' with a {behavior_pattern['data_days']}-day average of "
            f"{behavior_pattern['avg_emission']} kg CO₂/day. "
        )
        if behavior_pattern["trend_type"] == "consistently_improving":
            insight += "Strong positive trajectory — maintain current habits."
        elif "worsening" in behavior_pattern["trend_type"]:
            insight += (
                f"Addressing your {dominant} habits offers the greatest leverage "
                "given the worsening multi-day trend."
            )

    # Anomaly context
    if anomalies:
        confidence = min(confidence + 0.15, 1.0)
        fields     = ", ".join(a["field"] for a in anomalies)
        insight += (
            f"⚠️ Anomaly detected in: {fields}. "
            "Today is an outlier — interpret projections with caution. "
        )

    # Improvement opportunity
    if dominant == "transportation":
        saving = round(transport * 0.76, 3)
        insight += (
            f"Switching to electric transport could save ~{saving} kg CO₂/day "
            f"(~{round(saving * 30, 1)} kg/month)."
        )
    else:
        saving = round(device * 0.40, 3)
        insight += (
            f"Reducing device usage by 40% could save ~{saving} kg CO₂/day "
            f"(~{round(saving * 30, 1)} kg/month)."
        )

    return insight, round(min(confidence, 1.0), 2)


# ═══════════════════════════════════════════════════════════════════════════
# 8.  BEHAVIOUR ANALYSIS  [UPDATED] — trend-aware + pattern-aware
# ═══════════════════════════════════════════════════════════════════════════

def analyze_behavior(
    screen_time: float,
    usage_type: str,
    charging_freq: int,
    distance: float,
    fuel_type: str,
    trend: Optional[dict] = None,
    behavior_pattern: Optional[dict] = None,
) -> list[str]:
    patterns: list[str] = []

    # Temporal trend
    if trend and trend.get("available"):
        patterns.append(f"{trend['emoji']}  {trend['label']}")
        if trend["direction"] == "increased" and trend["delta_h"] >= 1:
            patterns.append(
                "⚠️  Upward screen-time trend — sustained increases raise device "
                "emissions day-over-day."
            )
        elif trend["direction"] == "decreased":
            patterns.append(
                "✅  Downward screen-time trend — consistent reductions will "
                "meaningfully lower your weekly device footprint."
            )

    # Screen time
    if screen_time > 6:
        patterns.append("⚠️  High screen usage detected (> 6 h/day).")
    elif screen_time > 3:
        patterns.append("ℹ️  Moderate screen usage (3–6 h/day).")
    else:
        patterns.append("✅  Low screen usage (< 3 h/day) — well done.")

    if usage_type.lower() == "gaming":
        patterns.append("🎮  Heavy device workload pattern (gaming mode).")

    if charging_freq >= 3:
        patterns.append("🔌  Frequent charging habit detected (≥ 3 times/day).")

    # Distance
    if distance > 50:
        patterns.append("🚘  Long-distance travel pattern detected (> 50 km/day).")
    elif distance > 20:
        patterns.append("🚗  Moderate daily commute (20–50 km).")
    else:
        patterns.append("✅  Short travel distance (< 20 km) — low transport impact.")

    # Fuel
    if fuel_type.lower() == "electric":
        patterns.append("⚡  Electric vehicle user — significantly lower transport emissions.")
    elif fuel_type.lower() == "petrol":
        patterns.append("⛽  Petrol vehicle — highest-emission transport choice.")

    # [NEW] Multi-day pattern overlay
    if behavior_pattern and behavior_pattern.get("data_days", 0) >= 3:
        cat_label = behavior_pattern["usage_category"].replace("_", " ").title()
        patterns.append(
            f"📊  Multi-day profile ({behavior_pattern['data_days']} days): "
            f"{cat_label} | avg screen {behavior_pattern['avg_screen_time']}h/day | "
            f"avg emissions {behavior_pattern['avg_emission']} kg CO₂/day | "
            f"trend: {behavior_pattern['trend_type'].replace('_', ' ')}."
        )

    return patterns


# ═══════════════════════════════════════════════════════════════════════════
# 9.  PREDICTION ENGINE  [UPDATED] — trend-aware, confidence-scored
# ═══════════════════════════════════════════════════════════════════════════

def predict_future_emissions(
    total_daily: float,
    days: int = 30,
    history: Optional[dict] = None,
) -> dict:
    """
    [UPDATED] Trend-aware 30-day prediction using linear regression over history.

    Confidence
    ──────────
    "low"    — no history; straight-line projection
    "medium" — 3–6 days of history
    "high"   — 7+ days; stable trend signal
    """
    if not history or len(history.get("emissions", [])) < 3:
        projected   = round(total_daily * days, 2)
        optimistic  = round(projected * 0.75, 2)
        pessimistic = round(projected * 1.10, 2)
        return {
            "days":                    days,
            "projected_kg":            projected,
            "optimistic_kg":           optimistic,
            "pessimistic_kg":          pessimistic,
            "confidence":              "low",
            "trend_slope_kg_per_day":  0.0,
            "reasoning": (
                "Straight-line projection (insufficient historical data). "
                "Supply past data via user_id for trend-aware prediction."
            ),
            "note": (
                f"Based on today's {total_daily} kg CO₂, you could emit "
                f"{projected} kg over {days} days. "
                f"With recommendations: ~{optimistic} kg."
            ),
        }

    emissions = history["emissions"]
    n         = len(emissions)

    # ── Least-squares linear regression slope ─────────────────────────────
    x_mean = (n - 1) / 2
    y_mean = sum(emissions) / n
    num    = sum((i - x_mean) * (emissions[i] - y_mean) for i in range(n))
    den    = sum((i - x_mean) ** 2                       for i in range(n))
    slope  = round(num / den, 5) if den != 0 else 0.0

    confidence = "high" if n >= 7 else "medium"

    # ── Cumulative trend-adjusted projections ─────────────────────────────
    projected   = round(sum(max(0.0, total_daily + slope *        d) for d in range(1, days + 1)), 2)
    optimistic  = round(sum(max(0.0, total_daily + (slope - 0.10) * d) for d in range(1, days + 1)), 2)
    pessimistic = round(sum(max(0.0, total_daily + (slope + 0.05) * d) for d in range(1, days + 1)), 2)

    # ── Human-readable reasoning ───────────────────────────────────────────
    if slope < -0.05:
        trend_desc = f"decreasing trend (slope {slope:+.3f} kg/day)"
        trend_note = "Projected total is lower than a flat estimate — great direction."
    elif slope > 0.05:
        trend_desc = f"increasing trend (slope {slope:+.3f} kg/day)"
        trend_note = "⚠️ Projected total is higher than flat — habit change needed."
    else:
        trend_desc = f"stable trend (slope {slope:+.3f} kg/day)"
        trend_note = "Emissions roughly constant — small changes will shift the needle."

    return {
        "days":                    days,
        "projected_kg":            projected,
        "optimistic_kg":           optimistic,
        "pessimistic_kg":          pessimistic,
        "confidence":              confidence,
        "trend_slope_kg_per_day":  slope,
        "reasoning": (
            f"Trend-aware prediction using {n}-day history. "
            f"Detected {trend_desc}. {trend_note}"
        ),
        "note": (
            f"Over the next {days} days you are projected to emit {projected} kg CO₂. "
            f"With improvements: {optimistic} kg | Without action: {pessimistic} kg."
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════
# 9b. [NEW FEATURE v3.0] TRENDING SOLUTIONS MODULE
#
#  DESIGN CONTRACT
#  ───────────────
#  • get_trending_solutions()     — personal mode
#  • get_org_trending_solutions() — organisation mode
#
#  These functions are INTENTIONALLY NOT called inside analyze_personal()
#  or analyze_organisation().  The default pipeline only populates
#  "trending_solutions": []  as an empty placeholder.
#
#  The frontend calls the dedicated Flask endpoint /api/trending when
#  the user clicks the "Trending Solutions" tab, keeping the two
#  suggestion types completely separated.
#
#  Rule: nothing in this section may alter "suggestions" in any way.
# ═══════════════════════════════════════════════════════════════════════════

def _match_triggers(entry: dict, context: dict) -> bool:
    """
    Return True if ALL triggers in the catalogue entry fire for this context.

    context keys:
        fuel_type (str), distance (float), screen_time (float),
        charging_freq (int), usage_type (str), category (str)

    An entry with an empty trigger dict {} is universal → always matches.
    """
    t = entry.get("trigger", {})
    if not t:
        return True  # universal entry

    checks = []
    if "fuel_type"         in t: checks.append(context.get("fuel_type",    "").lower() == t["fuel_type"].lower())
    if "usage_type"        in t: checks.append(context.get("usage_type",   "").lower() == t["usage_type"].lower())
    if "category"          in t: checks.append(context.get("category",     "").lower() == t["category"].lower())
    if "distance_gt"       in t: checks.append(context.get("distance",      0) >  t["distance_gt"])
    if "screen_time_gt"    in t: checks.append(context.get("screen_time",   0) >  t["screen_time_gt"])
    if "charging_freq_gt"  in t: checks.append(context.get("charging_freq", 0) >  t["charging_freq_gt"])

    return all(checks)


def _format_trending_entry(entry: dict) -> dict:
    """
    Return a clean, frontend-ready trending solution dict.
    Strips internal trigger logic; keeps only display fields.
    """
    return {
        "id":          entry["id"],
        "title":       entry["title"],
        "trend_msg":   entry["trend_msg"],
        "global_stat": entry["global_stat"],
        "impact":      entry["impact"],
        "difficulty":  entry["difficulty"],
        "tags":        entry["tags"],
    }


def get_trending_solutions(
    screen_time: float,
    usage_type: str,
    charging_freq: int,
    distance: float,
    fuel_type: str,
    category: str = "Medium",
) -> list[dict]:
    """
    [NEW FEATURE v3.0] Return personalised trending solutions for a single user.

    IMPORTANT: This function is ONLY called by the dedicated Flask endpoint
    /api/trending or when the frontend explicitly requests the Trending tab.
    It must NEVER be imported into the normal suggestion pipeline.

    Parameters
    ----------
    screen_time   : hours of screen time today
    usage_type    : "gaming" | "streaming" | "normal"
    charging_freq : number of charges today
    distance      : km travelled today
    fuel_type     : "petrol" | "diesel" | "electric"
    category      : emission category — "Low" | "Medium" | "High"

    Returns
    -------
    list[dict] — matched trending solutions, each with display fields only.
                 Universal entries (empty trigger) always included last.
    """
    context = {
        "fuel_type":     fuel_type,
        "usage_type":    usage_type,
        "category":      category,
        "distance":      distance,
        "screen_time":   screen_time,
        "charging_freq": charging_freq,
    }

    triggered:  list[dict] = []   # entries matched by specific triggers
    universal:  list[dict] = []   # entries with empty trigger (always shown)
    seen_ids:   set[str]   = set()

    for entry in TRENDING_CATALOGUE:
        if entry["id"] in seen_ids:
            continue
        if not entry.get("trigger"):           # universal
            universal.append(_format_trending_entry(entry))
            seen_ids.add(entry["id"])
        elif _match_triggers(entry, context):  # specifically triggered
            triggered.append(_format_trending_entry(entry))
            seen_ids.add(entry["id"])

    # Triggered solutions first (most relevant), then universal awareness entries
    return triggered + universal


def get_org_trending_solutions(users: list[dict], org_category: str = "Medium") -> dict:
    """
    [NEW FEATURE v3.0] Return group-level trending solutions for organisation mode.

    Identifies the dominant pattern across all users (most common trigger) and
    surfaces the most relevant trending strategies at a group level.

    Parameters
    ----------
    users        : list of user dicts (same schema as analyze_organisation input)
    org_category : overall org emission category — "Low" | "Medium" | "High"

    Returns
    -------
    dict with keys:
        dominant_pattern  – str  : most common behavioural trigger across users
        group_trending    – list : deduplicated trending solutions for the group
        per_user_count    – dict : how many users each solution applies to
    """
    from collections import Counter

    # Count how many users trigger each catalogue entry
    entry_hit_count: Counter = Counter()

    for u in users:
        ctx = {
            "fuel_type":     u.get("fuel_type",     "petrol"),
            "usage_type":    u.get("usage_type",     "normal"),
            "category":      org_category,
            "distance":      u.get("distance",        0),
            "screen_time":   u.get("screen_time",     0),
            "charging_freq": u.get("charging_freq",   1),
        }
        for entry in TRENDING_CATALOGUE:
            if not entry.get("trigger") or _match_triggers(entry, ctx):
                entry_hit_count[entry["id"]] += 1

    # Sort entries: highest hit count first, universal entries last
    sorted_ids = sorted(
        entry_hit_count.keys(),
        key=lambda eid: (
            -entry_hit_count[eid],
            1 if not next((e for e in TRENDING_CATALOGUE if e["id"] == eid), {}).get("trigger") else 0,
        ),
    )

    entry_map     = {e["id"]: e for e in TRENDING_CATALOGUE}
    group_trending = [
        _format_trending_entry(entry_map[eid])
        for eid in sorted_ids
        if eid in entry_map
    ]
    per_user_count = {eid: entry_hit_count[eid] for eid in sorted_ids}

    # Dominant pattern = tag of the most-hit non-universal entry
    dominant_pattern = "mixed"
    for eid in sorted_ids:
        e = entry_map.get(eid, {})
        if e.get("trigger"):   # skip universal
            dominant_pattern = e["tags"][0] if e.get("tags") else "mixed"
            break

    return {
        "dominant_pattern": dominant_pattern,
        "group_trending":   group_trending,
        "per_user_count":   per_user_count,
    }


# ═══════════════════════════════════════════════════════════════════════════
# 10. PERSONAL MODE  [UPDATED] — full adaptive intelligence pipeline
# ═══════════════════════════════════════════════════════════════════════════

def analyze_personal(
    screen_time: float,
    usage_type: str,
    charging_freq: int,
    distance: float,
    fuel_type: str,
    prev_screen_time: Optional[float] = None,
    user_id: Optional[str] = None,       # [NEW] enables history, streaks, adaptive scoring
) -> dict:
    """
    [UPDATED] Full adaptive carbon footprint analysis for a single user.

    Parameters
    ----------
    screen_time      : hours of screen time today
    usage_type       : "gaming" | "streaming" | "normal"
    charging_freq    : number of charges today
    distance         : km travelled today
    fuel_type        : "petrol" | "diesel" | "electric"
    prev_screen_time : optional — yesterday's screen time (enables temporal trend)
    user_id          : optional — string key to enable persistent memory,
                       adaptive scoring, streaks, and behavioral learning

    Returns
    -------
    dict — fully backward-compatible + all v2.0 keys
    """
    # ── Step 1: Core emission calculations ───────────────────────────────
    device    = calculate_device_emissions(screen_time, usage_type, charging_freq)
    transport = calculate_transport_emissions(distance, fuel_type)
    total     = calculate_total_emissions(device, transport)

    # ── Step 2: Retrieve existing history (before updating) ───────────────
    history = USER_HISTORY.get(user_id) if user_id else None

    # ── Step 3: Anomaly detection (uses pre-update history for baseline) ──
    anomalies = detect_anomalies(screen_time, charging_freq, distance, history)

    # ── Step 4: Adaptive eco score (uses pre-update history) ──────────────
    eco_score, eco_score_reason = calculate_eco_score(total, device, transport, history)

    # ── Step 5: Update history + build behavior pattern ───────────────────
    if user_id:
        history = _update_history(user_id, total, screen_time, eco_score)
    behavior_pattern = _build_behavior_pattern(history) if history else {"data_days": 0}

    # ── Step 6: Streak (uses post-update history) ─────────────────────────
    streak = (
        _update_streak(history, total) if history
        else {"current_streak": 0, "status": "stable", "message": "No streak data yet."}
    )

    # ── Step 7: Temporal trend ────────────────────────────────────────────
    trend = _screen_time_trend(screen_time, prev_screen_time)

    # ── Step 8: Category + breakdown ──────────────────────────────────────
    category  = categorize_emissions(total)
    breakdown = calculate_breakdown(device, transport)

    # ── Step 9: Smart suggestions ─────────────────────────────────────────
    suggestions = generate_suggestions(
        device, transport, screen_time, usage_type,
        charging_freq, distance, fuel_type,
        trend=trend, anomalies=anomalies, behavior_pattern=behavior_pattern,
    )

    # ── Step 10: Analytical insight ───────────────────────────────────────
    insight_text, insight_confidence = generate_insight(
        device, transport, category, eco_score, behavior_pattern, anomalies,
    )

    # ── Step 11: Behaviour analysis ───────────────────────────────────────
    behavior_analysis = analyze_behavior(
        screen_time, usage_type, charging_freq, distance, fuel_type,
        trend=trend, behavior_pattern=behavior_pattern,
    )

    # ── Step 12: Trend-aware prediction ───────────────────────────────────
    prediction = predict_future_emissions(total, history=history)

    # ── Assemble final output (all legacy keys + new v2.0 keys) ──────────
    result: dict = {
        # ── Legacy keys (backward-compatible) ──────────────────────
        "mode":               "personal",
        "total_carbon_kg":    total,
        "device_kg":          device,
        "transport_kg":       transport,
        "category":           category,
        "eco_score":          eco_score,
        "breakdown":          breakdown,
        "suggestions":        suggestions,
        "insight":            insight_text,
        "behavior_analysis":  behavior_analysis,
        "prediction":         prediction,

        # ── v2.0 extended keys ──────────────────────────────────────
        "eco_score_reason":   eco_score_reason,      # [UPDATED]
        "anomalies":          anomalies,              # [NEW FEATURE]
        "behavior_pattern":   behavior_pattern,       # [NEW FEATURE]
        "streak":             streak,                 # [NEW FEATURE]
        "insight_confidence": insight_confidence,     # [UPDATED]

        # ── v3.0 Trending Solutions placeholder ─────────────────────
        # Empty by default.  Populated ONLY when the frontend requests
        # the Trending tab via /api/trending — never during normal flow.
        "trending_solutions": [],                     # [NEW FEATURE v3.0]
    }

    # Temporal trend (optional; backward-compatible)
    if trend.get("available"):
        result["screen_time_trend"] = {
            "yesterday_h": prev_screen_time,
            "today_h":     screen_time,
            "delta_h":     trend["delta_h"],
            "delta_pct":   trend["delta_pct"],
            "direction":   trend["direction"],
            "summary":     trend["label"],
        }

    return result


# ═══════════════════════════════════════════════════════════════════════════
# 11. ORGANISATION MODE  [UPDATED] — with leaderboard
# ═══════════════════════════════════════════════════════════════════════════

def _aggregate_users(users: list[dict]) -> dict:
    results, totals, devices, transports = [], [], [], []

    for u in users:
        r = analyze_personal(
            screen_time      = u.get("screen_time",      0),
            usage_type       = u.get("usage_type",       "normal"),
            charging_freq    = u.get("charging_freq",    1),
            distance         = u.get("distance",         0),
            fuel_type        = u.get("fuel_type",        "petrol"),
            prev_screen_time = u.get("prev_screen_time", None),
            user_id          = u.get("user_id",          None),
        )
        results.append(r)
        totals.append(r["total_carbon_kg"])
        devices.append(r["device_kg"])
        transports.append(r["transport_kg"])

    n = len(users)
    return {
        "user_results":     results,
        "avg_total_kg":     round(sum(totals)     / n, 4),
        "avg_device_kg":    round(sum(devices)    / n, 4),
        "avg_transport_kg": round(sum(transports) / n, 4),
        "total_org_kg":     round(sum(totals),         4),
        "user_count":       n,
    }


def _build_leaderboard(agg: dict, users: list[dict]) -> list[dict]:
    """
    [NEW FEATURE] Rank users by eco_score (desc), then streak improvement (desc).

    Each entry: rank, user_id, eco_score, total_carbon_kg, category,
                streak_status, improvement (+1/0/-1)
    """
    board = []
    for i, (r, u) in enumerate(zip(agg["user_results"], users)):
        uid           = u.get("user_id", f"user_{i + 1}")
        streak_status = r.get("streak", {}).get("status", "stable")
        improvement   = {"improving": 1, "stable": 0, "declining": -1}.get(streak_status, 0)
        board.append({
            "user_id":         uid,
            "eco_score":       r["eco_score"],
            "total_carbon_kg": r["total_carbon_kg"],
            "category":        r["category"],
            "streak_status":   streak_status,
            "improvement":     improvement,
        })

    board.sort(key=lambda x: (-x["eco_score"], -x["improvement"]))
    for rank, entry in enumerate(board, 1):
        entry["rank"] = rank

    return board


def _org_recommendations(agg: dict) -> list[str]:
    recs: list[str] = []
    avg_t, avg_d = agg["avg_transport_kg"], agg["avg_device_kg"]

    if avg_t > avg_d:
        recs.append(
            "🏢 Transport is the organisation's top emission source. "
            "Introduce a company EV fleet or subsidised public-transit passes."
        )
        recs.append(
            "📍 Encourage remote-work days to reduce commute-related emissions."
        )
    else:
        recs.append(
            "💻 Device usage dominates. Roll out a power-management policy "
            "(screen-off after 5 min idle, power-saver defaults organisation-wide)."
        )
        recs.append(
            "🖥️  Schedule batch jobs overnight when grid carbon intensity is lower."
        )

    if agg["avg_total_kg"] > MEDIUM_THRESHOLD:
        recs.append(
            "📊 Average emissions are Medium/High. "
            "Set a 20% reduction target with monthly sustainability reviews."
        )

    recs.append(
        "🌳 Offset unavoidable emissions via a verified programme "
        "(Gold Standard or Verra VCS certified)."
    )
    recs.append(
        "🏆 Launch an Eco Challenge — the team that reduces emissions most "
        "each quarter earns recognition and incentives."
    )
    return recs


def _org_insight(agg: dict) -> str:
    avg      = agg["avg_total_kg"]
    cat      = categorize_emissions(avg)
    score    = calculate_eco_score(avg)[0]
    dominant = (
        "transportation" if agg["avg_transport_kg"] >= agg["avg_device_kg"]
        else "device usage"
    )
    return (
        f"Across {agg['user_count']} users, the average daily footprint is "
        f"{avg} kg CO₂ ({cat}, eco score {score}/100). "
        f"{dominant.capitalize()} is the dominant emission source organisation-wide."
    )


def analyze_organisation(users: list[dict]) -> dict:
    """
    [UPDATED] Multi-user carbon analysis with leaderboard ranking.

    Parameters
    ----------
    users : list of dicts — same keys as analyze_personal() + optional "user_id"

    Returns
    -------
    dict — backward-compatible output + "leaderboard" key
    """
    if not users:
        return {"error": "No user data provided."}

    agg         = _aggregate_users(users)
    avg_total   = agg["avg_total_kg"]
    category    = categorize_emissions(avg_total)
    eco_score   = calculate_eco_score(avg_total)[0]
    breakdown   = calculate_breakdown(agg["avg_device_kg"], agg["avg_transport_kg"])
    leaderboard = _build_leaderboard(agg, users)          # [NEW FEATURE]
    recs        = _org_recommendations(agg)
    insight     = _org_insight(agg)
    prediction  = predict_future_emissions(avg_total)

    return {
        # ── Legacy keys ──────────────────────────────────
        "mode":                  "organisation",
        "user_count":            agg["user_count"],
        "total_org_carbon_kg":   agg["total_org_kg"],
        "avg_carbon_kg":         avg_total,
        "avg_device_kg":         agg["avg_device_kg"],
        "avg_transport_kg":      agg["avg_transport_kg"],
        "category":              category,
        "eco_score":             eco_score,
        "breakdown":             breakdown,
        "group_recommendations": recs,
        "insight":               insight,
        "prediction":            prediction,
        "user_results":          agg["user_results"],

        # ── v2.0 key ─────────────────────────────────────
        "leaderboard":           leaderboard,             # [NEW FEATURE]

        # ── v3.0 Trending Solutions placeholder ──────────
        # Empty by default. Call get_org_trending_solutions() explicitly
        # via /api/trending/organisation when the Trending tab is clicked.
        "trending_solutions":    {},                       # [NEW FEATURE v3.0]
    }


# ═══════════════════════════════════════════════════════════════════════════
# 12. FLASK-READY HANDLERS  (backward-compatible; accept optional user_id)
# ═══════════════════════════════════════════════════════════════════════════

def flask_personal_handler(data: dict) -> dict:
    """
    Drop-in handler for a Flask /api/personal route.

    Example:
        @app.route("/api/personal", methods=["POST"])
        def personal():
            return jsonify(flask_personal_handler(request.get_json()))
    """
    required = ["screen_time", "usage_type", "charging_freq", "distance", "fuel_type"]
    missing  = [k for k in required if k not in data]
    if missing:
        return {"error": f"Missing fields: {missing}"}
    return analyze_personal(
        screen_time      = float(data["screen_time"]),
        usage_type       = str(data["usage_type"]),
        charging_freq    = int(data["charging_freq"]),
        distance         = float(data["distance"]),
        fuel_type        = str(data["fuel_type"]),
        prev_screen_time = float(data["prev_screen_time"]) if "prev_screen_time" in data else None,
        user_id          = str(data["user_id"]) if "user_id" in data else None,
    )


def flask_organisation_handler(data: dict) -> dict:
    """
    Drop-in handler for a Flask /api/organisation route.

    Example:
        @app.route("/api/organisation", methods=["POST"])
        def organisation():
            return jsonify(flask_organisation_handler(request.get_json()))
    """
    users = data.get("users", [])
    if not isinstance(users, list) or not users:
        return {"error": "Provide a non-empty 'users' list."}
    return analyze_organisation(users)


# [NEW FEATURE v3.0] ─────────────────────────────────────────────────────────

def flask_trending_handler(data: dict) -> dict:
    """
    [NEW FEATURE v3.0] Drop-in handler for the dedicated Trending Solutions tab.

    Called ONLY when the user clicks "Trending Solutions" in the frontend.
    NEVER called from the normal analysis pipeline.

    Expects the same payload as flask_personal_handler, plus the already-
    computed "category" field (so the frontend can pass it without re-running
    the full analysis).

    Example Flask route:
        @app.route("/api/trending", methods=["POST"])
        def trending():
            return jsonify(flask_trending_handler(request.get_json()))

    Example request body:
        {
            "screen_time": 5,
            "usage_type": "gaming",
            "charging_freq": 3,
            "distance": 40,
            "fuel_type": "petrol",
            "category": "High"        ← pass from previous /api/personal response
        }
    """
    required = ["screen_time", "usage_type", "charging_freq", "distance", "fuel_type"]
    missing  = [k for k in required if k not in data]
    if missing:
        return {"error": f"Missing fields: {missing}"}

    solutions = get_trending_solutions(
        screen_time   = float(data["screen_time"]),
        usage_type    = str(data["usage_type"]),
        charging_freq = int(data["charging_freq"]),
        distance      = float(data["distance"]),
        fuel_type     = str(data["fuel_type"]),
        category      = str(data.get("category", "Medium")),
    )
    return {
        "mode":               "trending_personal",
        "trending_solutions": solutions,
        "count":              len(solutions),
        "note": (
            "These solutions reflect real-world sustainability trends personalised "
            "to your activity profile. They complement — not replace — your AI suggestions."
        ),
    }


def flask_org_trending_handler(data: dict) -> dict:
    """
    [NEW FEATURE v3.0] Trending solutions for organisation mode.

    Example Flask route:
        @app.route("/api/trending/organisation", methods=["POST"])
        def org_trending():
            return jsonify(flask_org_trending_handler(request.get_json()))

    Example request body:
        {
            "users": [...],       ← same as /api/organisation
            "org_category": "High"
        }
    """
    users = data.get("users", [])
    if not isinstance(users, list) or not users:
        return {"error": "Provide a non-empty 'users' list."}

    result = get_org_trending_solutions(
        users        = users,
        org_category = str(data.get("org_category", "Medium")),
    )
    return {
        "mode": "trending_organisation",
        **result,
        "note": (
            "Group-level trending solutions ranked by how many team members they apply to. "
            "Dominant pattern identifies the most common emission driver across your organisation."
        ),
    }


# ═══════════════════════════════════════════════════════════════════════════
# QUICK DEMO  (python eco_carbon_ai.py)
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import json

    SEP = "═" * 65

    def show(label: str, result: dict, keys: Optional[list] = None) -> None:
        print(f"\n{SEP}\n  {label}\n{SEP}")
        subset = {k: result[k] for k in keys if k in result} if keys else result
        print(json.dumps(subset, indent=2, ensure_ascii=False))

    # ── DEMO 1: Personal, no history ─────────────────────────────────────
    r1 = analyze_personal(
        screen_time=5, usage_type="gaming",
        charging_freq=3, distance=40, fuel_type="petrol",
    )
    show("DEMO 1 — Personal (no history)", r1,
         ["total_carbon_kg", "category", "eco_score", "eco_score_reason",
          "insight", "insight_confidence", "anomalies", "streak"])

    # ── DEMO 2: 5-day improving history for user 'alice' ─────────────────
    print(f"\n{SEP}\n  DEMO 2 — Simulating 5-day improving history for 'alice'\n{SEP}")
    for day, (st, dist) in enumerate([(7, 50), (6, 45), (5, 40), (4, 35), (3, 30)], 1):
        r = analyze_personal(
            screen_time=st, usage_type="gaming",
            charging_freq=3, distance=dist, fuel_type="petrol",
            user_id="alice",
        )
        print(
            f"  Day {day}: total={r['total_carbon_kg']} kg | "
            f"eco_score={r['eco_score']} | streak={r['streak']}"
        )

    # Day 6 – full adaptive result
    r2 = analyze_personal(
        screen_time=2, usage_type="normal",
        charging_freq=1, distance=20, fuel_type="electric",
        prev_screen_time=3, user_id="alice",
    )
    show("  Day 6 (alice) — adaptive scoring active", r2,
         ["eco_score", "eco_score_reason", "streak", "behavior_pattern", "prediction"])

    # ── DEMO 3: Anomaly detection ─────────────────────────────────────────
    r3 = analyze_personal(
        screen_time=13, usage_type="gaming",
        charging_freq=7, distance=160, fuel_type="petrol",
        user_id="bob",
    )
    show("DEMO 3 — Anomaly Day (extreme values)", r3,
         ["total_carbon_kg", "category", "eco_score",
          "anomalies", "insight", "insight_confidence"])
    print("\n  Top suggestions:")
    for s in r3["suggestions"][:3]:
        print(f"    [{s['priority']}] {s['suggestion']}")
        print(f"        Impact: {s['impact_estimate']}")

    # ── DEMO 4: Organisation mode with leaderboard ────────────────────────
    org_users = [
        {"user_id": "u1", "screen_time": 5,  "usage_type": "gaming",
         "charging_freq": 3, "distance": 40, "fuel_type": "petrol",   "prev_screen_time": 3},
        {"user_id": "u2", "screen_time": 2,  "usage_type": "normal",
         "charging_freq": 1, "distance": 10, "fuel_type": "electric", "prev_screen_time": 4},
        {"user_id": "u3", "screen_time": 7,  "usage_type": "streaming",
         "charging_freq": 2, "distance": 25, "fuel_type": "diesel"},
        {"user_id": "u4", "screen_time": 3,  "usage_type": "normal",
         "charging_freq": 1, "distance": 5,  "fuel_type": "electric", "prev_screen_time": 3},
        {"user_id": "u5", "screen_time": 4,  "usage_type": "gaming",
         "charging_freq": 4, "distance": 60, "fuel_type": "petrol",   "prev_screen_time": 2},
    ]
    org = analyze_organisation(org_users)
    show("DEMO 4 — Organisation Mode (summary + leaderboard)",
         {k: v for k, v in org.items() if k != "user_results"},
         ["avg_carbon_kg", "eco_score", "category", "insight",
          "leaderboard", "group_recommendations", "prediction"])

    # ── DEMO 5: Trending Solutions Tab (personal) ─────────────────────────
    # Simulates the frontend clicking "Trending Solutions" tab for a
    # petrol driver with high screen time.
    trending_personal = flask_trending_handler({
        "screen_time":   7,
        "usage_type":    "gaming",
        "charging_freq": 4,
        "distance":      45,
        "fuel_type":     "petrol",
        "category":      "High",
    })
    print(f"\n{SEP}\n  DEMO 5 — Trending Solutions Tab (Personal)\n{SEP}")
    print(f"  Total trending solutions matched: {trending_personal['count']}\n")
    for ts in trending_personal["trending_solutions"]:
        print(f"  [{ts['difficulty'].upper()}] {ts['title']}")
        print(f"    → {ts['trend_msg'][:100]}...")
        print(f"    Impact : {ts['impact']}")
        print(f"    Stat   : {ts['global_stat']}\n")

    # ── DEMO 6: Trending Solutions Tab (organisation) ─────────────────────
    trending_org = flask_org_trending_handler({
        "users":        org_users,
        "org_category": "Medium",
    })
    print(f"\n{SEP}\n  DEMO 6 — Trending Solutions Tab (Organisation)\n{SEP}")
    print(f"  Dominant pattern : {trending_org['dominant_pattern']}")
    print(f"  Per-user counts  : {trending_org['per_user_count']}\n")
    print("  Top 3 group trending solutions:")
    for ts in trending_org["group_trending"][:3]:
        users_affected = trending_org["per_user_count"].get(ts["id"], 0)
        print(f"    [{ts['difficulty'].upper()}] {ts['title']}  ({users_affected}/{len(org_users)} users)")
        print(f"    Impact: {ts['impact']}\n")
