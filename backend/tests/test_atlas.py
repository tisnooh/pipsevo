from atlas import build_atlas_context, build_atlas_prompt, build_coaching_briefing, build_deterministic_coach_answer, build_pretrade_readiness, measured_trade_pnl


def test_metaapi_legacy_costs_are_not_measured_and_complete_zero_is_valid():
    trade = {"pnl": 100, "source_provider": "metaapi", "result_status": "closed"}
    assert measured_trade_pnl(trade) is None
    trade.update(pnl=0, provider_metadata={"net_pnl_available": True, "pnl_source": "provider"})
    assert measured_trade_pnl(trade) == 0


def test_historical_zero_tick_cost_is_not_measured_pnl():
    trade = {"pnl": 0, "result_status": "closed", "provider_metadata": {
        "pnl_source": "derived_tick_cost", "instrument_pricing": {"tickCost": [{"tickCost": 0}]},
    }}
    assert measured_trade_pnl(trade) is None
    trade["provider_metadata"]["instrument_pricing"]["tickCost"][0]["tickCost"] = 1
    assert measured_trade_pnl(trade) == 0
    trade["result_status"] = "open"
    assert measured_trade_pnl(trade) is None


def test_provider_prompt_has_a_bounded_context_budget():
    prompt = build_atlas_prompt("Review", "overall", {"notes": "x" * 200000, "evidence": [{"notes": "y" * 20000} for _ in range(1000)]})
    assert len(prompt) < 22000
    assert '"context_truncated":true' in prompt


def test_provider_context_omits_long_keys_explicitly_without_collisions():
    context = {"focus_trade": {"checklist_results": [{"x" * 128 + "a": True, "x" * 128 + "b": False}], "notes": "Valid note"}}
    prompt = build_atlas_prompt("Review", "post_trade", context)
    assert '"context_truncated":true' in prompt
    assert "Valid note" in prompt
    assert "x" * 128 not in prompt


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


def test_unknown_currency_is_not_invented_by_coaching_or_readiness():
    trade = {"id": "unknown", "account_id": "account-1", "date": "2026-09-30", "pnl": 500, "currency_available": False}
    context, evidence = build_atlas_context({}, [], [trade])
    assert context["metrics"]["net_pnl"] is None
    assert context["metrics"]["win_rate_percent"] is None
    assert evidence[0]["currency"] == "UNKNOWN"
    assert evidence[0]["pnl"] is None
    account = {**readiness_account(), "currency_available": False}
    result = build_pretrade_readiness(readiness_user(), account, [], valid_proposal())
    assert result["data"]["today_measured_pnl"] is None
    assert {"currency", "daily_loss"}.issubset(result["warnings"])
    assert result["status"] != "ready"


def test_atlas_loss_streak_uses_closure_clock_not_insertion_order():
    trades = [
        {"id": "loss", "account_id": "account-1", "date": "2026-09-30", "exit_time": "11:00:00", "created_at": "2026-10-01T10:00:00Z", "pnl": -10},
        {"id": "win", "account_id": "account-1", "date": "2026-09-30", "exit_time": "10:00:00", "created_at": "2026-10-01T11:00:00Z", "pnl": 50},
    ]
    context, _ = build_atlas_context({}, [], trades)
    assert context["discipline"]["current_losing_streak"] == 1
    result = build_pretrade_readiness(readiness_user(), readiness_account(), trades, valid_proposal())
    assert result["data"]["consecutive_losses"] == 1


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


def test_win_rate_does_not_infer_net_profit_from_prices_without_costs():
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

    assert context["metrics"]["wins"] == 0
    assert context["metrics"]["losses"] == 0
    assert context["metrics"]["win_rate_percent"] is None
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


def test_missing_costs_do_not_turn_gross_profit_into_a_net_result():
    trade = {"pnl": 50, "source_provider": "tradelocker", "entry": 100,
             "exit_price": 110, "direction": "long", "provider_metadata": {
                 "pnl_source": "provider", "net_pnl_available": False,
             }}
    context, _ = build_atlas_context({}, [], [trade])
    assert context["metrics"]["net_pnl"] is None
    assert context["metrics"]["win_rate_percent"] is None
    trade["provider_metadata"]["net_pnl_available"] = True
    trade["pnl"] = -2
    context, _ = build_atlas_context({}, [], [trade])
    assert context["metrics"]["net_pnl"] == -2
    assert context["metrics"]["win_rate_percent"] == 0


def test_manual_and_provider_confirmed_zero_remain_measured():
    assert measured_trade_pnl({"pnl": 0}) == 0
    assert measured_trade_pnl(
        {
            "pnl": 0,
            "source_provider": "tradelocker",
            "provider_metadata": {"pnl_source": "derived_tick_cost", "net_pnl_available": True},
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
    assert "ne prouve jamais une causalité" in prompt


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


def readiness_user():
    return {
        "rules": {
            "max_trades": 3,
            "daily_loss_limit": 300,
            "max_risk_pct": 1,
            "stop_after_loss": 2,
            "min_rr": 1.5,
            "pre_trade_checklist": [
                {"id": "plan", "label": "Setup conforme", "enabled": True, "required": True},
                {"id": "news", "label": "News vérifiées", "enabled": True, "required": False},
            ],
        }
    }


def readiness_account():
    return {
        "id": "account-1",
        "name": "Compte 50K",
        "status": "active",
        "balance": 50_000,
        "daily_loss_limit": 300,
    }


def test_unconfirmed_profile_limits_are_not_applied_by_atlas():
    user = readiness_user()
    user["rules"]["configured"] = False
    report = build_pretrade_readiness(user, readiness_account(), [], valid_proposal())
    checks = {row["id"]: row for row in report["checks"]}
    assert checks["max_trades"]["status"] == "warn"
    assert checks["max_trades"]["limit"] is None
    assert checks["risk"]["status"] == "warn"


def test_global_daily_limit_cannot_be_compared_across_native_currencies():
    user = readiness_user()
    user["rules"]["daily_loss_currency"] = "USD"
    account = readiness_account()
    account.update(currency="EUR", daily_loss_limit=None)
    rows = [{"account_id": account["id"], "date": "2026-09-30", "pnl": -100, "provider_currency": "EUR"}]
    report = build_pretrade_readiness(user, account, rows, valid_proposal())
    check = next(row for row in report["checks"] if row["id"] == "daily_loss")
    assert check["status"] == "warn"
    assert check["observed"] is None
    assert "USD" in check["detail"] and "EUR" in check["detail"]


def test_account_daily_limit_remains_authoritative_in_its_native_currency():
    user = readiness_user()
    user["rules"]["daily_loss_currency"] = "USD"
    account = readiness_account()
    account.update(currency="EUR", daily_loss_limit=200)
    rows = [{"account_id": account["id"], "date": "2026-09-30", "pnl": -250, "provider_currency": "EUR"}]
    report = build_pretrade_readiness(user, account, rows, valid_proposal())
    check = next(row for row in report["checks"] if row["id"] == "daily_loss")
    assert check["status"] == "block"
    assert check["limit"] == -200


def test_zero_account_daily_limit_does_not_fall_back_to_global_limit():
    account = readiness_account()
    account["daily_loss_limit"] = 0
    report = build_pretrade_readiness(readiness_user(), account, [], valid_proposal())
    check = next(row for row in report["checks"] if row["id"] == "daily_loss")
    assert check["limit"] is None
    assert check["status"] == "warn"


def test_open_and_cancelled_trades_do_not_hide_a_confirmed_loss_streak():
    rows = [
        {"id": "l1", "account_id": "account-1", "date": "2026-09-30", "exit_time": "10:00:00", "pnl": -100},
        {"id": "l2", "account_id": "account-1", "date": "2026-09-30", "exit_time": "11:00:00", "pnl": -100},
        {"id": "open", "account_id": "account-1", "date": "2026-09-30", "exit_time": "12:00:00", "result_status": "open", "pnl": 500},
        {"id": "cancel", "account_id": "account-1", "date": "2026-09-30", "exit_time": "13:00:00", "result_status": "cancelled", "pnl": 1000, "plan_respected": False},
    ]
    context, _ = build_atlas_context(readiness_user(), [], rows)
    assert context["discipline"]["current_losing_streak"] == 2
    assert context["data_quality"]["trades_with_plan_status"] == 0
    report = build_pretrade_readiness(readiness_user(), readiness_account(), rows, valid_proposal())
    checks = {row["id"]: row for row in report["checks"]}
    assert checks["loss_streak"]["status"] == "block"
    assert checks["max_trades"]["observed"] == 4
    assert checks["open_positions"]["status"] == "warn"
    assert report["data"]["today_measured_pnl"] == -200


def test_unknown_closed_result_never_confirms_the_end_of_a_losing_streak():
    rows = [{"account_id": "account-1", "date": "2026-09-30", "pnl": None}]
    report = build_pretrade_readiness(readiness_user(), readiness_account(), rows, valid_proposal())
    check = next(row for row in report["checks"] if row["id"] == "loss_streak")
    assert check["status"] == "warn"


def valid_proposal():
    return {
        "account_id": "account-1",
        "local_date": "2026-09-30",
        "instrument": "ES",
        "planned_risk_percent": 0.5,
        "entry": 100,
        "stop": 99,
        "take_profit": 102,
        "emotion": "Calme",
        "emotion_intensity": "low",
        "checklist_results": [{"id": "plan", "checked": True}],
    }


def test_pretrade_readiness_is_ready_when_process_rules_are_met():
    result = build_pretrade_readiness(readiness_user(), readiness_account(), [], valid_proposal())

    assert result["status"] == "ready"
    assert result["score"] == 100
    assert result["process_only"] is True
    assert result["blockers"] == []
    assert result["data"]["planned_rr"] == 2
    assert "ne garantit aucun résultat" in result["disclaimer"]


def test_pretrade_readiness_blocks_hard_rule_violations():
    proposal = valid_proposal()
    proposal.update({
        "planned_risk_percent": 2,
        "stop": None,
        "emotion": "FOMO",
        "emotion_intensity": "high",
        "checklist_results": [],
    })
    trades = [
        {"account_id": "account-1", "date": "2026-09-30", "pnl": -100},
        {"account_id": "account-1", "date": "2026-09-30", "pnl": -200},
        {"account_id": "account-1", "date": "2026-09-30", "pnl": -10},
    ]

    result = build_pretrade_readiness(readiness_user(), readiness_account(), trades, proposal)

    assert result["status"] == "blocked"
    assert {"max_trades", "daily_loss", "loss_streak", "risk", "stop", "checklist", "emotion"}.issubset(set(result["blockers"]))
    assert result["data"]["today_trade_count"] == 3


def test_pretrade_readiness_does_not_treat_unmeasured_provider_pnl_as_loss():
    trade = {
        "account_id": "account-1",
        "date": "2026-09-30",
        "pnl": -250,
        "source_provider": "tradelocker",
        "provider_metadata": {"pnl_source": "unavailable"},
    }

    result = build_pretrade_readiness(readiness_user(), readiness_account(), [trade], valid_proposal())

    assert result["data"]["today_measured_pnl"] is None
    assert result["data"]["today_pnl_complete"] is False
    assert "daily_loss" in result["warnings"]
    assert "daily_loss" not in result["blockers"]


def test_readiness_blocks_risk_larger_than_remaining_daily_margin():
    result = build_pretrade_readiness(readiness_user(), readiness_account(), [
        {"account_id": "account-1", "date": "2026-09-30", "pnl": -100},
    ], valid_proposal())
    assert result["data"]["planned_risk_amount"] == 250
    assert "daily_loss" in result["blockers"]


def test_readiness_does_not_accept_inconsistent_risk_amount_and_percent():
    proposal = {**valid_proposal(), "planned_risk_amount": 10000}
    result = build_pretrade_readiness(readiness_user(), readiness_account(), [], proposal)
    assert "risk" in result["blockers"]
    assert "daily_loss" in result["blockers"]


def test_readiness_rejects_false_string_as_a_checked_item():
    proposal = {**valid_proposal(), "checklist_results": [{"id": "plan", "checked": "false"}]}
    result = build_pretrade_readiness(readiness_user(), readiness_account(), [], proposal)
    assert "checklist" in result["blockers"]


def test_readiness_rejects_stop_and_target_on_the_same_side_of_entry():
    proposal = {**valid_proposal(), "stop": 101, "take_profit": 103}
    result = build_pretrade_readiness(readiness_user(), readiness_account(), [], proposal)
    assert "reward_risk" in result["blockers"]
    assert result["data"]["planned_rr"] is None


def test_readiness_verifies_drawdown_against_planned_loss_without_guessing_trailing_floor():
    account = {**readiness_account(), "max_drawdown": 2000, "drawdown_floor": 49900}
    result = build_pretrade_readiness(readiness_user(), account, [], valid_proposal())
    assert "drawdown" in result["blockers"]
    account.pop("drawdown_floor")
    account["drawdown_mode"] = "trailing"
    result = build_pretrade_readiness(readiness_user(), account, [], valid_proposal())
    assert "drawdown" in result["warnings"]
    account["high_water_mark"] = 50100
    result = build_pretrade_readiness(readiness_user(), account, [], valid_proposal())
    assert "drawdown" not in result["blockers"]
    assert "drawdown" not in result["warnings"]


def test_atlas_does_not_bridge_unmeasured_trade_between_losses():
    trades = [
        {"date": "2026-10-08", "pnl": -10},
        {"date": "2026-10-09", "pnl": None},
        {"date": "2026-10-10", "pnl": -20},
    ]
    context, _ = build_atlas_context({}, [], trades)
    assert context["discipline"]["current_losing_streak"] == 1
    assert context["discipline"]["max_losing_streak"] == 1


def test_pretrade_readiness_warns_instead_of_inventing_unconfigured_limits():
    user = {"rules": {"pre_trade_checklist": []}}
    account = {"id": "account-1", "name": "Manual", "status": "active", "balance": 10_000}

    result = build_pretrade_readiness(user, account, [], valid_proposal())

    assert result["status"] == "caution"
    assert "max_trades" in result["warnings"]
    assert "daily_loss" in result["warnings"]
    assert "loss_streak" in result["warnings"]


def test_atlas_context_exposes_measured_discipline_patterns():
    trades = [
        {"id": "1", "date": "2026-09-01", "pnl": 100, "plan_respected": True, "emotion": "Calme", "mistakes": [], "checklist_results": [{"checked": True}, {"checked": True}]},
        {"id": "2", "date": "2026-09-02", "pnl": -80, "plan_respected": False, "emotion": "FOMO", "mistakes": ["Entrée anticipée"], "checklist_results": [{"checked": True}, {"checked": False}]},
        {"id": "3", "date": "2026-09-03", "pnl": -20, "plan_respected": False, "emotion": "FOMO", "mistakes": ["Entrée anticipée"]},
    ]

    context, _ = build_atlas_context({}, [], trades)
    discipline = context["discipline"]

    assert discipline["plan_respected"] == {"sample_size": 1, "net_pnl": 100.0, "average_pnl": 100.0}
    assert discipline["plan_not_respected"] == {"sample_size": 2, "net_pnl": -100.0, "average_pnl": -50.0}
    assert discipline["average_pnl_difference"] == 150.0
    assert discipline["checklist_completion_percent"] == 75.0
    assert discipline["current_losing_streak"] == 2
    assert discipline["max_losing_streak"] == 2
    assert discipline["high_risk_emotion_trade_count"] == 2
    assert discipline["documented_mistakes"] == [{"name": "Entrée anticipée", "count": 2}]


def test_atlas_prompt_uses_context_specific_guidance():
    prompt = build_atlas_prompt("Analyse mes émotions", "emotions", {})
    assert "états émotionnels documentés" in prompt
    assert "Ne prétends jamais à une causalité" in prompt


def test_weekly_coaching_briefing_prioritizes_discipline_alerts():
    user = {
        "rules": {
            "max_trades": 2,
            "stop_after_loss": 2,
        }
    }
    trades = [
        {"id": "1", "date": "2026-09-29", "instrument": "ES", "pnl": 100, "plan_respected": True, "notes": "OK", "emotion": "Calme", "checklist_results": [{"checked": True}]},
        {"id": "2", "date": "2026-09-30", "instrument": "NQ", "pnl": -50, "plan_respected": False, "emotion": "FOMO", "mistakes": ["Entrée anticipée"], "checklist_results": [{"checked": False}]},
        {"id": "3", "date": "2026-09-30", "instrument": "NQ", "pnl": -60, "plan_respected": False, "emotion": "FOMO", "checklist_results": [{"checked": False}]},
        {"id": "4", "date": "2026-09-30", "instrument": "ES", "pnl": -20, "plan_respected": False, "emotion": "Calme", "checklist_results": [{"checked": True}]},
    ]

    briefing = build_coaching_briefing(user, [], trades, period="weekly", local_date="2026-09-30")

    alert_ids = {row["id"] for row in briefing["alerts"]}
    assert {"loss-streak", "overtrading", "plan-respect", "checklist-completion", "high-risk-emotions", "review-completeness"}.issubset(alert_ids)
    assert briefing["overview"]["trade_count"] == 4
    assert briefing["overview"]["measured_pnl"] == -30
    assert briefing["action_plan"][0]["source_alert_id"] in {"loss-streak", "overtrading", "plan-respect"}
    assert len(briefing["action_plan"]) == 3
    assert briefing["explainability"]["process_only"] is True


def test_daily_briefing_excludes_other_dates_and_preserves_missing_pnl():
    trades = [
        {"id": "old", "date": "2026-09-29", "pnl": 500, "plan_respected": True},
        {
            "id": "today",
            "date": "2026-09-30",
            "pnl": 0,
            "source_provider": "tradelocker",
            "provider_metadata": {"pnl_source": "unavailable"},
        },
    ]

    briefing = build_coaching_briefing({}, [], trades, period="daily", local_date="2026-09-30")

    assert briefing["range"] == {"start": "2026-09-30", "end": "2026-09-30"}
    assert briefing["overview"]["trade_count"] == 1
    assert briefing["overview"]["measured_pnl"] is None
    assert "pnl-coverage" in {row["id"] for row in briefing["alerts"]}
    assert briefing["daily"][0]["measured_pnl"] is None


def test_briefing_with_clean_period_keeps_single_review_habit():
    trade = {
        "id": "clean",
        "date": "2026-09-30",
        "pnl": 25,
        "plan_respected": True,
        "notes": "Plan appliqué",
        "emotion": "Calme",
        "checklist_results": [{"checked": True}],
    }

    briefing = build_coaching_briefing({}, [], [trade], local_date="2026-09-30")

    assert briefing["alerts"] == []
    assert briefing["review_queue"] == []
    assert briefing["action_plan"][0]["id"] == "weekly:keep-reviewing"


def test_atlas_prompt_makes_deterministic_briefing_authoritative():
    prompt = build_atlas_prompt("Fais mon bilan", "weekly_review", {"coaching_briefing": {"alerts": []}})

    assert "moteur déterministe" in prompt
    assert "jamais les supprimer" in prompt


def test_atlas_prompt_removes_direct_user_and_trading_identifiers():
    prompt = build_atlas_prompt(
        "Fais mon bilan",
        "weekly_review",
        {
            "trader": {"name": "Samuel Secret", "trader_type": "day trader"},
            "accounts": [{"id": "account-secret", "name": "Mon compte privé", "firm": "FTMO"}],
            "evidence": [{"alias": "T1", "trade_id": "trade-secret", "pnl": 10}],
            "focus_trade": {"trade_id": "trade-secret", "alias": "FOCUS", "pnl": 10},
            "payouts": {"records": [{"account_id": "account-secret", "amount": 50}]},
            "coaching_briefing": {"review_queue": [{"trade_id": "trade-secret", "instrument": "ES"}]},
        },
    )

    assert "Samuel Secret" not in prompt
    assert "account-secret" not in prompt
    assert "trade-secret" not in prompt
    assert "Mon compte privé" not in prompt
    assert '"alias":"T1"' in prompt
    assert '"alias":"A1"' in prompt


def test_free_deterministic_answer_remains_useful_without_provider_key():
    trades = [
        {
            "id": "trade-1",
            "date": "2026-09-30",
            "instrument": "ES",
            "pnl": 0,
            "source_provider": "tradelocker",
            "provider_metadata": {"pnl_source": "unavailable"},
        }
    ]
    context, _ = build_atlas_context({}, [], trades)
    context["coaching_briefing"] = build_coaching_briefing(
        {}, [], trades, period="daily", local_date="2026-09-30"
    )

    answer = build_deterministic_coach_answer("Analyse ma journée", "daily_briefing", context)

    assert "Atlas — analyse gratuite" in answer
    assert "P&L disponible : non mesuré" in answer
    assert "Les valeurs absentes ne sont jamais transformées en zéro" in answer
    assert "ni un signal ni un conseil d’investissement" in answer


def test_atlas_separates_native_currencies_without_inventing_fx_conversion():
    trades = [
        {"id": "usd", "date": "2026-10-10", "pnl": 100, "provider_currency": "USD", "setup": "FVG"},
        {"id": "eur", "date": "2026-10-10", "pnl": -50, "provider_currency": "EUR", "setup": "FVG"},
    ]
    context, evidence = build_atlas_context({}, [], trades)
    assert context["metrics"]["net_pnl"] is None
    assert context["metrics"]["net_pnl_by_currency"] == {"EUR": -50, "USD": 100}
    assert context["metrics"]["profit_factor"] is None
    assert context["metrics"]["win_rate_percent"] == 50
    assert context["setup_performance"][0]["pnl"] is None
    assert context["setup_performance"][0]["eligible_for_comparison"] is False
    assert evidence[1]["currency"] == "EUR"
    context["coaching_briefing"] = build_coaching_briefing({}, [], trades, period="daily", local_date="2026-10-10")
    assert context["coaching_briefing"]["daily"][0]["measured_pnl"] is None
    answer = build_deterministic_coach_answer("Review", "daily_briefing", context)
    assert "non agrégé (plusieurs devises)" in answer
    assert "+50.00 USD" not in answer


def test_atlas_euro_single_currency_report_is_not_relabelled_usd():
    trades = [{"id": "eur", "date": "2026-10-10", "pnl": 40, "provider_currency": "EUR"}]
    context, _ = build_atlas_context({}, [], trades)
    context["coaching_briefing"] = build_coaching_briefing({}, [], trades, period="daily", local_date="2026-10-10")
    answer = build_deterministic_coach_answer("Review", "daily_briefing", context)
    assert "+40.00 EUR" in answer
    assert "+40.00 USD" not in answer


def test_atlas_does_not_add_payouts_across_currencies():
    context, _ = build_atlas_context({}, [], [], [
        {"amount": 100, "currency": "EUR"}, {"amount": 200, "currency": "USD"},
    ])
    assert context["payouts"]["total_amount"] is None
    assert context["payouts"]["amount_by_currency"] == {"EUR": 100, "USD": 200}
