from datetime import date
from pathlib import Path
from unittest.mock import Mock

import requests

from collector.page_client import MobilePricePageClient

FIXTURE_DIR = Path(__file__).parent / "fixtures"


def response(html):
    result = Mock()
    result.text = html
    result.raise_for_status.return_value = None
    return result


def test_client_requests_every_page_without_external_network():
    first = (FIXTURE_DIR / "mobile_prices.html").read_text()
    empty = (FIXTURE_DIR / "mobile_empty.html").read_text()
    session = Mock()
    session.post.side_effect = [response(first), response(empty)]
    client = MobilePricePageClient(session=session, delay_range=(0, 0))

    rows = client.fetch_date(date(2026, 7, 24))

    assert len(rows) == 2
    assert session.post.call_count == 2
    first_payload = session.post.call_args_list[0].kwargs["data"]
    second_payload = session.post.call_args_list[1].kwargs["data"]
    assert first_payload["searchYear"] == "2026"
    assert first_payload["searchMonth"] == "07"
    assert first_payload["searchDate"] == "24"
    assert second_payload["pageIndex"] == "2"


def test_client_rate_limits_across_date_boundaries():
    empty = (FIXTURE_DIR / "mobile_empty.html").read_text()
    session = Mock()
    session.post.side_effect = [response(empty), response(empty)]
    sleeper = Mock()
    client = MobilePricePageClient(
        session=session,
        delay_range=(1, 1),
        sleeper=sleeper,
    )

    client.fetch_date(date(2026, 7, 24))
    client.fetch_date(date(2026, 7, 25))

    sleeper.assert_called_once_with(1)
    assert session.post.call_count == 2


def test_client_retries_a_failed_page_without_external_network():
    empty = (FIXTURE_DIR / "mobile_empty.html").read_text()
    session = Mock()
    session.post.side_effect = [requests.Timeout(), response(empty)]
    sleeper = Mock()
    client = MobilePricePageClient(
        session=session,
        delay_range=(0, 0),
        max_retries=2,
        sleeper=sleeper,
    )

    rows = client.fetch_date(date(2026, 7, 24))

    assert rows == ()
    assert session.post.call_count == 2
    assert sleeper.call_count == 2
