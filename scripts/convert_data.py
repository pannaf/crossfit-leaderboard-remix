import csv
import json
import re


def parse_event_result(event_str):
    """Parse event result string like '8th (48:54.00) 72 pts' or '1st (02:35.00) 100 pts'"""
    if not event_str or event_str.strip() == "":
        return None

    # Handle CAP cases like "28th (CAP+6) 6 pts" or "30th (CAP+3)" (missing points)
    cap_match = re.match(r"(\d+)(?:st|nd|rd|th)\s+\(CAP\+(\d+)\)(?:\s+(\d+)\s+pts)?", event_str)
    if cap_match:
        place = int(cap_match.group(1))
        cap_plus = int(cap_match.group(2))
        points = int(cap_match.group(3)) if cap_match.group(3) else 0  # Default to 0 if points missing
        return {"place": place, "time": f"CAP+{cap_plus}", "points": points}

    # Handle regular cases like "8th (48:54.00) 72 pts" or "30th (265 lb)" (missing points)
    match = re.match(r"(\d+)(?:st|nd|rd|th)\s+\(([^)]+)\)(?:\s+(\d+)\s+pts)?", event_str)
    if match:
        place = int(match.group(1))
        time = match.group(2)
        points = int(match.group(3)) if match.group(3) else 0  # Default to 0 if points missing
        return {"place": place, "time": time, "points": points}

    return None


def extract_athlete_info(name_str):
    """Extract athlete information from the name string"""
    lines = name_str.strip().split("\n")
    name = lines[0].strip()

    info = {"name": name, "country": "", "region": "", "affiliate": "", "age": "", "height_weight": ""}

    for line in lines[1:]:
        line = line.strip()
        if not line or line == "View Profile":
            continue

        if "Age" in line:
            info["age"] = line
        elif "in |" in line or "cm |" in line:
            info["height_weight"] = line
        elif info["country"] == "":
            info["country"] = line
        elif info["region"] == "":
            info["region"] = line
        else:
            info["affiliate"] = line

    return info


def get_place_string(place: int) -> str:
    if place == 1:
        return "1st"
    if place == 2:
        return "2nd"
    if place == 3:
        return "3rd"
    if place % 10 == 1 and place != 11:
        return f"{place}st"
    if place % 10 == 2 and place != 12:
        return f"{place}nd"
    if place % 10 == 3 and place != 13:
        return f"{place}rd"
    return f"{place}th"


def derive_events_from_headers(fieldnames):
    """Infer event column names from CSV headers by excluding core columns."""
    if not fieldnames:
        return []
    core = {"RANK", "NAME", "POINTS"}
    events = []
    for h in fieldnames:
        if not h:
            continue
        key = str(h).strip()
        if key.upper() in core:
            continue
        events.append(key)
    return events


def build_event_point_map(athletes, events):
    """Derive exact observed points for each event/place from the CSV results."""
    event_point_map = {event: {} for event in events}
    event_field_size = {event: 0 for event in events}

    for athlete in athletes:
        results = athlete.get("events", {}) or {}
        for event, res in results.items():
            if not res:
                continue
            place = res.get("place")
            pts = res.get("points", 0) or 0
            if isinstance(place, int):
                place_str = get_place_string(place)
                # Prefer the highest points seen for a given place (safety against inconsistencies)
                current = event_point_map[event].get(place_str)
                if current is None or pts > current:
                    event_point_map[event][place_str] = pts
                # Track field size by max place observed
                if place > event_field_size[event]:
                    event_field_size[event] = place

    return event_point_map, event_field_size


def build_official_scales_2024():
    """Return official 2024 scales for fields of size 40, 30, 20, 10 as place->points dicts."""

    def place_key(i: int) -> str:
        return get_place_string(i)

    scale40_vals = [
        100,
        97,
        94,
        91,
        88,
        85,
        82,
        79,
        76,
        73,
        70,
        67,
        64,
        61,
        58,
        55,
        52,
        49,
        46,
        43,
        40,
        37,
        34,
        32,
        30,
        28,
        26,
        24,
        22,
        20,
        18,
        16,
        14,
        12,
        10,
        8,
        6,
        4,
        2,
        0,
    ]
    scale30_vals = [
        100,
        96,
        92,
        88,
        84,
        80,
        76,
        72,
        68,
        64,
        60,
        56,
        52,
        48,
        45,
        42,
        39,
        36,
        33,
        30,
        27,
        24,
        21,
        18,
        15,
        12,
        9,
        6,
        3,
        0,
    ]
    scale20_vals = [
        100,
        95,
        90,
        85,
        80,
        75,
        70,
        65,
        60,
        55,
        50,
        45,
        40,
        35,
        30,
        25,
        20,
        15,
        10,
        0,
    ]
    scale10_vals = [
        100,
        90,
        80,
        70,
        60,
        50,
        40,
        30,
        20,
        10,
    ]

    def to_map(vals):
        return {place_key(i + 1): vals[i] for i in range(len(vals))}

    return {
        "40": to_map(scale40_vals),
        "30": to_map(scale30_vals),
        "20": to_map(scale20_vals),
        "10": to_map(scale10_vals),
    }


def build_official_event_point_map_2024(event_field_size):
    """Choose the appropriate 2024 scale per event by observed field size."""
    official_scales = build_official_scales_2024()
    event_map = {}
    for event, size in event_field_size.items():
        # Select column based on competitor count
        if size >= 31:
            key = "40"
        elif size >= 21:
            key = "30"
        elif size >= 11:
            key = "20"
        else:
            key = "10"
        # Truncate to observed size
        full_map = official_scales[key]
        truncated = {k: v for k, v in full_map.items() if int(k[:-2]) <= size}
        event_map[event] = truncated
    return official_scales, event_map


def convert_csv_to_json():
    athletes = []

    gender_abbreviation = "M"
    gender = "men"

    with open(f"xfit-leaderboard-2024-{gender_abbreviation}.csv", "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        # Derive events from headers
        events = derive_events_from_headers(reader.fieldnames)

        for row in reader:
            athlete_info = extract_athlete_info(row["NAME"])

            athlete = {
                "rank": int(row["RANK"]),
                "name": athlete_info["name"],
                "country": athlete_info["country"],
                "region": athlete_info["region"],
                "affiliate": athlete_info["affiliate"],
                "age": athlete_info["age"],
                "height_weight": athlete_info["height_weight"],
                "total_points": int(row["POINTS"]),
                "events": {e: parse_event_result(row.get(e, "")) for e in events},
            }

            athletes.append(athlete)

    # Derive exact points per event/place and observed field size
    event_point_map, event_field_size = build_event_point_map(athletes, events)
    # Build official 2024 scale references and per-event maps (chosen by field size)
    official_point_scales_2024, official_event_point_map_2024 = build_official_event_point_map_2024(event_field_size)

    # Create the final JSON structure (no global point_system; we keep exact observed maps instead)
    data = {
        "year": 2024,
        "gender": gender,
        "events": events,
        "event_point_map": event_point_map,
        "official_point_scales_2024": official_point_scales_2024,
        "official_event_point_map_2024": official_event_point_map_2024,
        "event_field_size": event_field_size,
        "athletes": athletes,
    }

    # Use underscore naming to match the app loader (e.g., 2024_leaderboard_data-men.json)
    with open(f"2024_leaderboard_data-{gender}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Converted {len(athletes)} athletes to JSON format")
    print(f"Data saved to 2024_leaderboard_data-{gender}.json")


if __name__ == "__main__":
    convert_csv_to_json()
