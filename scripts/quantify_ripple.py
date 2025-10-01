#!/usr/bin/env python3
import json
import copy
from collections import defaultdict
from pathlib import Path

# --------------------------
# Load dataset
# --------------------------
with open("crossfit-leaderboard-remix/public/leaderboard_data-men.json", "r") as f:
    data = json.load(f)

events = data["events"]
point_system = {int(k.rstrip("stndrh")): v for k, v in data["point_system"].items()}
athletes = data["athletes"]

# --------------------------
# Helper: compute leaderboard given athlete data
# --------------------------
def compute_leaderboard(athletes):
    leaderboard = []
    for a in athletes:
        total = sum(ev["points"] for ev in a["events"].values())
        leaderboard.append((a["name"], total))
    leaderboard.sort(key=lambda x: (-x[1], x[0]))
    ranks = {name: i + 1 for i, (name, _) in enumerate(leaderboard)}
    return ranks, leaderboard

# --------------------------
# Helper: apply perturbation
# --------------------------
def perturb(athletes, athlete_name, event_name, direction):
    """
    direction = +1 (improve by one place) or -1 (worsen by one place)
    """
    athletes_copy = copy.deepcopy(athletes)
    # Extract current placements in this event
    placements = [(a["name"], a["events"][event_name]["place"]) for a in athletes_copy]
    placements.sort(key=lambda x: x[1])
    idx = [name for name, _ in placements].index(athlete_name)

    # Cannot move outside bounds
    if direction == -1 and idx == len(placements) - 1:
        return None
    if direction == +1 and idx == 0:
        return None

    swap_idx = idx - direction  # note: improve = -1 index shift
    athlete_swap = placements[swap_idx][0]

    # Swap placements
    for a in athletes_copy:
        if a["name"] == athlete_name:
            a["events"][event_name]["place"] += -direction
            a["events"][event_name]["points"] = point_system[a["events"][event_name]["place"]]
        if a["name"] == athlete_swap:
            a["events"][event_name]["place"] += direction
            a["events"][event_name]["points"] = point_system[a["events"][event_name]["place"]]
    return athletes_copy

# --------------------------
# Main analysis
# --------------------------
original_ranks, original_lb = compute_leaderboard(athletes)
displacements = []

for athlete in athletes:
    for event in events:
        for direction in [+1, -1]:
            perturbed = perturb(athletes, athlete["name"], event, direction)
            if perturbed is None:
                continue

            new_ranks, _ = compute_leaderboard(perturbed)
            self_rank_change = new_ranks[athlete["name"]] - original_ranks[athlete["name"]]

            # Check for JME condition
            if self_rank_change == 0:
                changed = [
                    (name, original_ranks[name], new_ranks[name])
                    for name in original_ranks
                    if original_ranks[name] != new_ranks[name]
                ]
                if changed:
                    displacements.append({
                        "athlete": athlete["name"],
                        "event": event,
                        "direction": "improve" if direction == +1 else "worsen",
                        "ripple_count": len(changed),
                        "changes": changed
                    })

# --------------------------
# Results
# --------------------------
print(f"Total JME displacements detected: {len(displacements)}")
for d in displacements[:10]:  # show a sample
    print(
        f"{d['athlete']} ({d['direction']} in {d['event']}): "
        f"rippled {d['ripple_count']} athletes -> {d['changes'][:3]}..."
    )

# Save full results
Path("results").mkdir(exist_ok=True)
with open("results/jme_displacements.json", "w") as f:
    json.dump(displacements, f, indent=2)

# --------------------------
# Results: filter for Top 10 ripples
# --------------------------
top10_displacements = []
for d in displacements:
    top10_changes = [
        (name, old, new)
        for name, old, new in d["changes"]
        if old <= 10 or new <= 10
    ]
    if top10_changes:
        top10_displacements.append({
            **d,
            "top10_changes": top10_changes,
            "top10_ripple_count": len(top10_changes)
        })

print(f"Total JME displacements: {len(displacements)}")
print(f"Top 10 ripple effects: {len(top10_displacements)}")

# Show a few examples
for d in top10_displacements:
    print(
        f"{d['athlete']} ({d['direction']} in {d['event']}): "
        f"TOP-10 ripple {d['top10_ripple_count']} athletes -> {d['top10_changes'][:3]}..."
    )

# Save both
with open("results/jme_top10_displacements.json", "w") as f:
    json.dump(top10_displacements, f, indent=2)


