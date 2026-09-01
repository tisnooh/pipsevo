from economic_calendar import normalize_forex_factory_events


def test_normalizes_and_sorts_forex_factory_events():
    rows = [
        {
            "title": "CPI y/y",
            "country": "USD",
            "date": "2026-09-01T08:30:00-04:00",
            "impact": "High",
            "forecast": "2.8%",
            "previous": "2.7%",
        },
        {
            "title": "Manufacturing PMI",
            "country": "EUR",
            "date": "2026-09-01T09:00:00+02:00",
            "impact": "Medium",
            "actual": "51.2",
        },
    ]

    events = normalize_forex_factory_events(rows)

    assert [event["currency"] for event in events] == ["EUR", "USD"]
    assert events[0]["impact"] == 2
    assert events[1]["impact"] == 3
    assert events[1]["forecast"] == "2.8%"


def test_ignores_rows_without_valid_title_or_date():
    events = normalize_forex_factory_events(
        [
            {"title": "", "date": "2026-09-01T10:00:00Z"},
            {"title": "Broken", "date": "not-a-date"},
            {"title": "Valid", "country": "All", "date": "2026-09-01T10:00:00Z", "impact": "Low"},
        ]
    )

    assert len(events) == 1
    assert events[0]["currency"] == "ALL"
    assert events[0]["impact"] == 1
