#!/usr/bin/env python3

import json
import os
import re
from typing import Dict, List, Optional


WORKSPACE_ROOT = "/Users/panna/code/hobby/crossfit-leaderboard"
PUBLIC_JSON = os.path.join(WORKSPACE_ROOT, "crossfit-leaderboard-remix", "public", "2025_leaderboard_data-men.json")


def is_time_like(value: str) -> bool:
    if not value:
        return False
    s = str(value).strip().lower()
    # Exclude non-time units
    if any(x in s for x in ["lb", "pt", "rep", "cap", "dq", "wd", "—", "-", "n/a"]):
        return False
    return bool(
        re.match(
            r"^\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,2})?)?(?:\.\d{1,2})?$|^\d+(?:\.\d{1,2})?$",
            s,
        )
    )


def parse_time_seconds(value: str) -> Optional[float]:
    if not is_time_like(value):
        return None
    s = str(value).strip()
    if ":" not in s:
        try:
            return float(s)
        except ValueError:
            return None
    try:
        parts = s.split(":")
        parts = [p for p in parts if p != ""]
        if len(parts) == 2:
            minutes = int(parts[0])
            seconds = float(parts[1])
            return minutes * 60 + seconds
        if len(parts) == 3:
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = float(parts[2])
            return hours * 3600 + minutes * 60 + seconds
    except Exception:
        return None
    return None


def build_points_lookup(finish_rows: List[Dict]) -> Dict[int, int]:
    lookup: Dict[int, int] = {}
    for r in finish_rows:
        place = int(r.get("place", 0) or 0)
        pts = int(r.get("points", 0) or 0)
        if place and (place not in lookup or pts > lookup[place]):
            lookup[place] = pts
    return lookup


def main() -> None:
    with open(PUBLIC_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    events: List[str] = data.get("events", [])
    finish_order: Dict[str, List[Dict]] = data.get("event_finish_order", {})
    athletes: List[Dict] = data.get("athletes", [])

    # Precompute points per place per event
    event_points: Dict[str, Dict[int, int]] = {ev: build_points_lookup(finish_order.get(ev, [])) for ev in events}

    # Build quick lookup of finish rows per event sorted by place
    event_rows_by_place: Dict[str, Dict[int, List[Dict]]] = {}
    for ev in events:
        place_map: Dict[int, List[Dict]] = {}
        for r in finish_order.get(ev, []):
            place = int(r.get("place", 0) or 0)
            place_map.setdefault(place, []).append(r)
        event_rows_by_place[ev] = place_map

    # Evaluate for multiple thresholds
    thresholds = [1.0, 2.0, 3.0, 4.0, 5.0]
    results_by_thresh: Dict[float, List[Dict]] = {t: [] for t in thresholds}

    for athlete in athletes:
        name = athlete.get("name", "")
        gains_by_thresh: Dict[float, int] = {t: 0 for t in thresholds}
        used_events_by_thresh: Dict[float, int] = {t: 0 for t in thresholds}
        perfs: Dict[str, Dict] = athlete.get("events", {})

        for ev in events:
            perf = perfs.get(ev)
            if not perf:
                continue
            place = int(perf.get("place", 0) or 0)
            if place <= 1:
                continue
            my_time_str = str(perf.get("time", "") or "").strip()
            my_time = parse_time_seconds(my_time_str)
            if my_time is None:
                continue  # skip non-time events

            # Precompute the number of places within each threshold
            best_by_place: List[float] = []
            for p in range(place - 1, 0, -1):
                rows = event_rows_by_place.get(ev, {}).get(p, [])
                best_t = None
                for r in rows:
                    t = parse_time_seconds(str(r.get("time", "") or ""))
                    if t is not None and (best_t is None or t < best_t):
                        best_t = t
                if best_t is None:
                    continue
                best_by_place.append(best_t)

            for thresh in thresholds:
                count = 0
                for t in best_by_place:
                    gap = my_time - t
                    if 0 <= gap <= thresh:
                        count += 1
                    else:
                        break
                if count <= 0:
                    continue
                old_pts = int(perf.get("points", 0) or 0)
                new_place = max(1, place - count)
                new_pts = int(event_points.get(ev, {}).get(new_place, old_pts))
                gain = max(0, new_pts - old_pts)
                if gain > 0:
                    gains_by_thresh[thresh] += gain
                    used_events_by_thresh[thresh] += 1

        for thresh in thresholds:
            results_by_thresh[thresh].append(
                {
                    "name": name,
                    "events_used": used_events_by_thresh[thresh],
                    "additional_points": gains_by_thresh[thresh],
                }
            )

    # Output one CSV per threshold to stdout sequentially
    for thresh in thresholds:
        rows = results_by_thresh[thresh]
        rows.sort(key=lambda r: r["additional_points"], reverse=True)
        print(f"Threshold={thresh}s")
        print("Athlete,EventsUsed,AdditionalPoints")
        for r in rows:
            print(f"{r['name']},{r['events_used']},{r['additional_points']}")
        print("")


if __name__ == "__main__":
    main()
