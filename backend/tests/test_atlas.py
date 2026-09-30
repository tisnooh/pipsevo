from atlas import build_atlas_context, build_atlas_prompt, build_coaching_briefing, build_deterministic_coach_answer, build_pretrade_readiness, measured_trade_pnl


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

    assert result["data"]["today_measured_pnl"] == 0
    assert "daily_loss" not in result["blockers"]


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
