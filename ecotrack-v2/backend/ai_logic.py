import random


USAGE_FACTORS = {
    "gaming": 2.0,
    "streaming": 1.5,
    "normal": 1.0,
}


def calculate_carbon(screen_time, charging_freq, usage_type):
    """Calculate the carbon footprint score for the given usage."""
    usage_factor = USAGE_FACTORS.get(usage_type, USAGE_FACTORS["normal"])
    carbon = (screen_time * 0.3) + (charging_freq * 0.5) + usage_factor
    return round(carbon, 2)


def get_category(carbon_score):
    """Return a human-readable category from the carbon score."""
    if carbon_score >= 4.5:
        return "High"
    if carbon_score >= 3.0:
        return "Moderate"
    return "Low"


def get_suggestions(usage_type, carbon_score):
    """Return practical suggestions to reduce the carbon footprint."""
    suggestions = []

    if usage_type == "gaming":
        suggestions.append("Reduce long gaming sessions when possible.")
        suggestions.append("Lower graphics settings to reduce power usage.")
    elif usage_type == "streaming":
        suggestions.append("Stream at a lower resolution when high quality is not needed.")
        suggestions.append("Download content once instead of repeated streaming.")
    else:
        suggestions.append("Use power-saving mode during light tasks.")

    if carbon_score >= 4.5:
        suggestions.append("Charge your device only when needed and avoid overcharging.")
        suggestions.append("Take short breaks to reduce continuous screen time.")
    elif carbon_score >= 3.0:
        suggestions.append("Try shortening non-essential screen time each day.")
    else:
        suggestions.append("Your current device usage is relatively efficient. Keep it up.")

    return suggestions


def generate_ai_insight(usage_type, carbon_score):
    """Generate a simple AI-style summary for the user."""
    category = get_category(carbon_score)

    insight_map = {
        "gaming": [
            "Your device is likely under heavy load from gaming activity, which increases energy use.",
            "Gaming appears to be the main reason for your higher power consumption right now.",
        ],
        "streaming": [
            "Streaming behavior suggests moderate energy usage, especially over longer sessions.",
            "Your pattern looks like media streaming, which can steadily increase your footprint over time.",
        ],
        "normal": [
            "Your device usage looks balanced and relatively energy-friendly.",
            "This appears to be normal daily usage with manageable energy demand.",
        ],
    }

    base_insight = random.choice(insight_map.get(usage_type, insight_map["normal"]))
    return f"{base_insight} Overall carbon impact is in the {category.lower()} range."
