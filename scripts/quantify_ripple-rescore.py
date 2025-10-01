#!/usr/bin/env python3
import json
import copy
import re
import math
import csv
from pathlib import Path

# --------------------------
# Load dataset
# --------------------------
with open("crossfit-leaderboard-remix/public/leaderboard_data-men.json", "r") as f:
    data = json.load(f)

events = data["events"]
official_point_system = {int(k.rstrip("stndrh")): v for k, v in data["point_system"].items()}
athletes = data["athletes"]

# --------------------------
# Raw score parsing
# --------------------------
def parse_raw_score(event_name, raw):
    if raw is None:
        return None, True
    raw = str(raw).strip()

    if any(keyword in event_name for keyword in ["Back Squat", "Snatch", "Clean"]):
        m = re.match(r"(\d+)", raw)
        if m:
            return float(m.group(1)), False  # higher is better
        return None, False

    if raw.startswith("CAP+"):
        try:
            over = int(raw.split("+")[1])
        except:
            over = 999
        return 1e6 + over, True

    if ":" in raw:
        parts = raw.split(":")
        if len(parts) == 2:
            m, s = parts
            total = float(m) * 60 + float(s)
        elif len(parts) == 3:
            h, m, s = parts
            total = float(h) * 3600 + float(m) * 60 + float(s)
        else:
            return None, True
        return total, True

    try:
        return float(raw), True
    except:
        return None, True

# --------------------------
# Scoring Methods
# --------------------------
def assign_points(athletes, method="official", k=0.5):
    num_athletes = len(athletes)

    for event in events:
        if method == "official":
            for a in athletes:
                place = a["events"][event]["place"]
                a["events"][event]["points"] = official_point_system.get(place, 0)

        elif method == "linear":
            for a in athletes:
                place = a["events"][event]["place"]
                a["events"][event]["points"] = num_athletes - place + 1

        elif method == "normalized":
            for a in athletes:
                place = a["events"][event]["place"]
                a["events"][event]["points"] = (num_athletes - place + 1) / num_athletes

        elif method == "continuous":
            parsed = []
            for a in athletes:
                val, lower_is_better = parse_raw_score(event, a["events"][event].get("time"))
                a["events"][event]["_raw_val"] = val
                a["events"][event]["_lower"] = lower_is_better
                if val is not None:
                    parsed.append(val)

            if not parsed:
                for a in athletes:
                    a["events"][event]["points"] = 0
                continue

            mn, mx = min(parsed), max(parsed)
            for a in athletes:
                val = a["events"][event]["_raw_val"]
                lower_is_better = a["events"][event]["_lower"]

                if val is None:
                    a["events"][event]["points"] = 0
                    continue

                if lower_is_better:
                    norm = (mx - val) / (mx - mn) if mx > mn else 1.0
                else:
                    norm = (val - mn) / (mx - mn) if mx > mn else 1.0

                a["events"][event]["points"] = norm * 100

        elif method == "decay":
            for a in athletes:
                place = a["events"][event]["place"]
                a["events"][event]["points"] = round(100 * math.exp(-k * (place - 1)), 4)

        else:
            raise ValueError(f"Unknown scoring method {method}")

# --------------------------
# Helpers
# --------------------------
def compute_leaderboard(athletes):
    leaderboard = []
    for a in athletes:
        total = sum(ev["points"] for ev in a["events"].values())
        leaderboard.append((a["name"], total))
    leaderboard.sort(key=lambda x: (-x[1], x[0]))
    ranks = {name: i + 1 for i, (name, _) in enumerate(leaderboard)}
    return ranks, leaderboard

def perturb(athletes, athlete_name, event_name, direction, method="official", k=0.5):
    athletes_copy = copy.deepcopy(athletes)
    placements = [(a["name"], a["events"][event_name]["place"]) for a in athletes_copy]
    placements.sort(key=lambda x: x[1])
    idx = [name for name, _ in placements].index(athlete_name)

    if direction == -1 and idx == len(placements) - 1:
        return None
    if direction == +1 and idx == 0:
        return None

    swap_idx = idx - direction
    athlete_swap = placements[swap_idx][0]

    for a in athletes_copy:
        if a["name"] == athlete_name:
            a["events"][event_name]["place"] += -direction
        if a["name"] == athlete_swap:
            a["events"][event_name]["place"] += direction

    assign_points(athletes_copy, method=method, k=k)
    return athletes_copy

# --------------------------
# JME Analysis
# --------------------------
def analyze(method="official", k=0.5):
    athletes_copy = copy.deepcopy(athletes)
    assign_points(athletes_copy, method=method, k=k)
    original_ranks, leaderboard = compute_leaderboard(athletes_copy)

    # compute displacements
    displacements = []
    for athlete in athletes_copy:
        for event in events:
            for direction in [+1, -1]:
                perturbed = perturb(athletes_copy, athlete["name"], event, direction, method=method, k=k)
                if perturbed is None:
                    continue
                new_ranks, _ = compute_leaderboard(perturbed)
                if new_ranks[athlete["name"]] == original_ranks[athlete["name"]]:
                    changed = [
                        (n, original_ranks[n], new_ranks[n])
                        for n in original_ranks if original_ranks[n] != new_ranks[n]
                    ]
                    if changed:
                        displacements.append(changed)

    total_displacements = len(displacements)
    # count ripple *events* that touched the Top-10
    top10_displacements = sum(
        1 for d in displacements
        if any(old <= 10 or new <= 10 for (_, old, new) in d)
    )


    num_athletes = len(athletes)
    num_events = len(events)
    FI = total_displacements / (num_athletes * num_events * 2)

    return {
        "method": method if method != "decay" else f"decay_k={k}",
        "top1": leaderboard[0][0],
        "top1_pts": leaderboard[0][1],
        "total": total_displacements,
        "top10": top10_displacements,
        "FI": round(FI, 4),
    }

# --------------------------
# Run + Export
# --------------------------
if __name__ == "__main__":
    results = []

    # Standard methods
    for method in ["official", "linear", "normalized", "continuous"]:
        res = analyze(method)
        results.append(res)
        print(res)

    # Decay sweep
    for k in [0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.25, 1.5, 1.75, 2.0]:
        res = analyze("decay", k=k)
        results.append(res)
        print(res)

    # Save to CSV
    Path("results").mkdir(exist_ok=True)
    with open("results/fragility_sweep.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["method", "top1", "top1_pts", "total", "top10", "FI"])
        writer.writeheader()
        writer.writerows(results)

    # Save to JSON
    with open("results/fragility_sweep.json", "w") as f:
        json.dump(results, f, indent=2)

