from atlas import build_atlas_context, build_atlas_prompt, measured_trade_pnl


def test_atlas_metrics_distinguish_missing_values_from_zero():
    trades = [
        {"id": "1", "date": "2026-09-01", "instrument": "ES", "pnl": 100, "r": 1, "setup": "FVG", "session": "NY", "plan_respected": True},
        {"id": "2", "date": "2026-09-01", "instrument": "NQ", "pnl": -50, "r": -0.5, "setup": "FVG", "session": "NY", "plan_respected": False},
        {"id": "3", "date": "2026-09-01", "instrument": "GC", "pnl": None, "setup": "Breakout", "plan_respected": None},
    ]

    context, evidence = build_atlas_context({"rules": {"max_trades": 2}}, [], trades)

    assert context["data_quality"]["trades_with_pnl"] == 2
    assert context["metrics"]["net_pnl"] == 50
    assert context["metrics"]["win_rate_percent"] == 50
    assert context["metrics"]["plan_respect_percent"] == 50
    assert context["metrics"]["average_r"] == 0.25
    assert context["overtrading_days"] == [{"date": "2026-09-01", "trade_count": 3, "limit": 2}]
    assert len(evidence) == 3


def test_atlas_group_comparison_requires_two_trades():
    trades = [
        {"id": "1", "pnl": 100, "setup": "FVG"},
        {"id": "2", "pnl": -20, "setup": "FVG"},
        {"id": "3", "pnl": 900, "setup": "Single sample"},
    ]

    context, _ = build_atlas_context({}, [], trades)
    groups = {row["name"]: row for row in context["setup_performance"]}

    assert groups["FVG"]["eligible_for_comparison"] is True
    assert groups["Single sample"]["eligible_for_comparison"] is False


def test_win_rate_uses_price_outcome_for_legacy_provider_zero_pnl():
    trades = [
        {
            "id": "short-win",
            "pnl": 0,
            "direction": "short",
            "entry": 4154.88,
            "exit_price": 4146,
            "result_status": "closed",
            "integration_connection_id": "connection-1",
            "provider_metadata": {},
        },
        {
            "id": "long-win",
            "pnl": 0,
            "direction": "long",
            "entry": 30476.6,
            "exit_price": 30479.5,
            "result_status": "closed",
            "integration_connection_id": "connection-1",
            "provider_metadata": {"pnl_source": "unavailable"},
        },
    ]

    context, _ = build_atlas_context({}, [], trades)

    assert context["metrics"]["wins"] == 2
    assert context["metrics"]["losses"] == 0
    assert context["metrics"]["win_rate_percent"] == 100
    assert context["metrics"]["net_pnl"] is None
    assert context["data_quality"]["trades_with_pnl"] == 0


def test_legacy_provider_zero_is_not_treated_as_measured_money():
    trade = {
        "pnl": 0,
        "source_provider": "tradelocker",
        "provider_metadata": {"pnl_source": "unavailable"},
    }

    assert measured_trade_pnl(trade) is None


def test_unavailable_provider_pnl_does_not_expose_partial_fees_as_net_profit():
    trade = {
        "pnl": -2.5,
        "source_provider": "tradelocker",
        "provider_metadata": {"pnl_source": "unavailable"},
    }

    assert measured_trade_pnl(trade) is None


def test_manual_and_provider_confirmed_zero_remain_measured():
    assert measured_trade_pnl({"pnl": 0}) == 0
    assert measured_trade_pnl(
        {
            "pnl": 0,
            "source_provider": "tradelocker",
            "provider_metadata": {"pnl_source": "derived_tick_cost"},
        }
    ) == 0


def test_measured_provider_zero_remains_a_breakeven():
    context, _ = build_atlas_context(
        {},
        [],
        [
            {
                "id": "breakeven",
                "pnl": 0,
                "direction": "long",
                "entry": 100,
                "exit_price": 101,
                "result_status": "closed",
                "integration_connection_id": "connection-1",
                "provider_metadata": {"pnl_source": "derived_tick_cost"},
            }
        ],
    )

    assert context["metrics"]["wins"] == 0
    assert context["metrics"]["losses"] == 0
    assert context["metrics"]["win_rate_percent"] == 0


def test_atlas_prompt_contains_no_inference_rule():
    context, _ = build_atlas_context({}, [], [{"id": "1", "pnl": None}])
    prompt = build_atlas_prompt("Analyse ma discipline", "discipline", context)

    assert "null signifie non mesurée" in prompt
    assert "eligible_for_comparison=true" in prompt
    assert "données sont insuffisantes" in prompt


def test_payouts_are_structured_without_inventing_missing_amounts():
    context, _ = build_atlas_context(
        {"id": "user-1"},
        [],
        [{"id": "t1", "date": "2026-09-02", "pnl": 20}],
        [{"date": "2026-09-03", "amount": 150}, {"date": "2026-09-04", "amount": None}],
    )
    assert context["payouts"]["count"] == 2
    assert context["payouts"]["total_amount"] == 150
    assert context["payouts"]["records"][1]["amount"] is None
