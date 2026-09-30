from admin.service import (
    is_real_execution,
    visible_connection_error,
    visible_connection_status,
)


def test_admin_counts_only_real_provider_executions():
    assert is_real_execution({"raw_metadata": {"status": "Filled"}}) is True
    assert is_real_execution({"raw_metadata": {"status": "Executed"}}) is True
    assert is_real_execution({"raw_metadata": {"status": "Cancelled"}}) is False
    assert is_real_execution({"raw_metadata": {"status": "Rejected"}}) is False
    assert is_real_execution({"raw_metadata": {}}) is True


def test_admin_marks_expired_connection_instead_of_showing_connected():
    assert visible_connection_status(
        {
            "connection_status": "connected",
            "last_error_code": "connection_expired",
        }
    ) == "expired"
    assert visible_connection_status(
        {"connection_status": "connected", "last_error_code": None}
    ) == "connected"


def test_admin_hides_error_older_than_latest_success():
    row = {
        "connection_status": "connected",
        "last_error_code": "connection_expired",
        "last_error_message": "Ancienne erreur",
        "last_sync_attempt_at": "2026-09-29T19:50:12+00:00",
        "last_successful_sync_at": "2026-09-29T19:50:31+00:00",
    }

    assert visible_connection_status(row) == "connected"
    assert visible_connection_error(row, "last_error_code") is None
    assert visible_connection_error(row, "last_error_message") is None


def test_admin_keeps_error_newer_than_latest_success():
    row = {
        "connection_status": "connected",
        "last_error_code": "connection_expired",
        "last_sync_attempt_at": "2026-09-29T20:00:00+00:00",
        "last_successful_sync_at": "2026-09-29T19:50:31+00:00",
    }

    assert visible_connection_status(row) == "expired"
    assert visible_connection_error(row, "last_error_code") == "connection_expired"
