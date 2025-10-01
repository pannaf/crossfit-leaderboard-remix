#!/usr/bin/env python3

import json
import os
import re
from statistics import median
from typing import Dict, List, Optional


WORKSPACE_ROOT = "/Users/panna/code/hobby/crossfit-leaderboard"
PUBLIC_JSON = os.path.join(WORKSPACE_ROOT, "crossfit-leaderboard-remix", "public", "2025_leaderboard_data-men.json")


def is_time_like(value: str) -> bool:
    if not value:
        return False
    s = str(value).strip().lower()
    if any(x in s for x in ["lb", "pt", "rep", "cap", "dq", "wd", "—", "-", "n/a"]):
        return False
    # Accept mm:ss, ss.ss, hh:mm:ss, etc.
    return bool(re.search(r"^\d{1,2}:\d{2}(?::\d{2}(?:\.\d{1,2})?)?(?:\.\d{1,2})?$|^\d+(?:\.\d{1,2})?$", s))


def parse_time_seconds(value: str) -> Optional[float]:
    if not is_time_like(value):
        return None
    s = str(value).strip()
    # Handle pure seconds like 9.40 or 57.03
    if ":" not in s:
        try:
            return float(s)
        except ValueError:
            return None
    try:
        parts = s.split(":")
        parts = [p for p in parts if p != ""]
        if len(parts) == 2:
            # mm:ss(.ss)
            minutes = int(parts[0])
            seconds = float(parts[1])
            return minutes * 60 + seconds
        if len(parts) == 3:
            # hh:mm:ss(.ss)
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds = float(parts[2])
            return hours * 3600 + minutes * 60 + seconds
    except Exception:
        return None
    return None


def format_seconds(sec: float) -> str:
    if sec < 60:
        return f"{sec:.2f} s"
    minutes = int(sec // 60)
    seconds = sec - minutes * 60
    return f"{minutes}:{seconds:05.2f}"


def main() -> None:
    with open(PUBLIC_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    events: List[str] = data.get("events", [])
    finish_order: Dict[str, List[Dict]] = data.get("event_finish_order", {})
    athletes: List[Dict] = data.get("athletes", [])

    # Build a quick lookup: event -> place -> list[rows] (handle ties)
    event_place_to_rows: Dict[str, Dict[int, List[Dict]]] = {}
    for event in events:
        place_map: Dict[int, List[Dict]] = {}
        for row in finish_order.get(event, []):
            place = int(row.get("place", 0) or 0)
            place_map.setdefault(place, []).append(row)
        event_place_to_rows[event] = place_map

    athlete_to_deltas: Dict[str, List[float]] = {}

    for athlete in athletes:
        name = athlete.get("name", "")
        deltas: List[float] = []

        perfs: Dict[str, Dict] = athlete.get("events", {})
        for event in events:
            perf = perfs.get(event)
            if not perf:
                continue
            place = int(perf.get("place", 0) or 0)
            if place <= 1:
                continue  # no one above
            my_time_str = str(perf.get("time", "") or "").strip()
            my_time = parse_time_seconds(my_time_str)
            if my_time is None:
                continue  # skip non-time events or CAP/rep/weight formats

            # Find the nearest strictly better place with a parseable time
            prev_place = place - 1
            prev_time = None
            while prev_place >= 1 and prev_time is None:
                rows = event_place_to_rows.get(event, {}).get(prev_place, [])
                for r in rows:
                    t = parse_time_seconds(str(r.get("time", "") or ""))
                    if t is not None:
                        prev_time = t
                        break
                prev_place -= 1 if prev_time is None else 0

            if prev_time is None:
                continue

            delta = max(0.0, my_time - prev_time + 0.01)
            deltas.append(delta)

        if deltas:
            athlete_to_deltas[name] = deltas

    # Build report: athlete, count, median_seconds, formatted
    rows = []
    for name, deltas in athlete_to_deltas.items():
        med = median(deltas)
        rows.append((name, len(deltas), med, format_seconds(med)))

    # Sort by median ascending
    rows.sort(key=lambda r: r[2])

    # Print report
    print("Athlete,EventsUsed,MedianGapSeconds,MedianGapFormatted")
    for name, cnt, med, disp in rows:
        print(f"{name},{cnt},{med:.2f},{disp}")


if __name__ == "__main__":
    main()
