from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List


FOREX_FACTORY_WEEK_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"


def _impact_level(value: Any) -> int:
    impact = str(value or "").strip().lower()
    if "high" in impact:
        return 3
    if "medium" in impact or "med" in impact:
        return 2
    if "low" in impact:
        return 1
    return 0


def normalize_forex_factory_events(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    for index, row in enumerate(rows):
        title = str(row.get("title") or "").strip()
        raw_date = str(row.get("date") or "").strip()
        if not title or not raw_date:
            continue
        try:
            parsed = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
        except ValueError:
            continue
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        currency = str(row.get("country") or "ALL").strip().upper() or "ALL"
        events.append(
            {
                "id": f"ff-{parsed.isoformat()}-{currency}-{title}-{index}",
                "title": title,
                "currency": currency,
                "impact": _impact_level(row.get("impact")),
                "date": parsed.astimezone(timezone.utc).isoformat(),
                "actual": row.get("actual") or "",
                "forecast": row.get("forecast") or "",
                "previous": row.get("previous") or "",
            }
        )
    return sorted(events, key=lambda event: event["date"])
