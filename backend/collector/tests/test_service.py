from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch

import pytest
from django.db import DatabaseError

from collector.models import CollectionLog, PriceRecord
from collector.page_client import PricePageClientError
from collector.parser import ParsedPriceRow
from collector.result import Result
from collector.services import (
    CollectionFailure,
    CollectionService,
    CollectionSuccess,
)


class StubPageClient:
    def __init__(self, rows=(), error=None):
        self.rows = tuple(rows)
        self.error = error
        self.requested_dates = []

    def fetch_date(self, target_date):
        self.requested_dates.append(target_date)
        if self.error:
            raise self.error
        return self.rows


def row(species="전복", quantity="2", average="10000"):
    return ParsedPriceRow(
        species=species,
        status="활",
        origin="완도",
        spec="10미",
        packaging="1kg",
        quantity=Decimal(quantity),
        price_high=Decimal("12000"),
        price_low=Decimal("8000"),
        price_avg=Decimal(average),
    )


@pytest.mark.django_db
def test_success_replaces_all_existing_rows_atomically():
    target = date(2026, 7, 24)
    PriceRecord.objects.create(
        date=target,
        species="기존",
        status="선",
        origin="부산",
        spec="대",
        packaging="상자",
        quantity=1,
        price_high=1,
        price_low=1,
        price_avg=1,
    )
    service = CollectionService(StubPageClient([row(), row("광어")]))

    result = service.collect_date(target)

    assert result.is_ok
    assert result.value.row_count == 2
    assert set(PriceRecord.objects.filter(date=target).values_list("species", flat=True)) == {
        "전복",
        "광어",
    }
    log = CollectionLog.objects.get(date=target)
    assert log.status == CollectionLog.Status.SUCCESS
    assert log.row_count == 2


@pytest.mark.django_db
def test_empty_rows_are_recorded_as_holiday():
    target = date(2026, 7, 26)
    service = CollectionService(StubPageClient())

    result = service.collect_date(target)

    assert result.is_ok
    assert result.value.is_holiday
    log = CollectionLog.objects.get(date=target)
    assert log.status == CollectionLog.Status.HOLIDAY
    assert log.expected_holiday is True


@pytest.mark.django_db
def test_fetch_failure_keeps_existing_data_and_records_failure():
    target = date(2026, 7, 24)
    old = PriceRecord.objects.create(
        date=target,
        species="기존",
        status="선",
        origin="부산",
        spec="대",
        packaging="상자",
        quantity=1,
        price_high=1,
        price_low=1,
        price_avg=1,
    )
    service = CollectionService(StubPageClient(error=PricePageClientError("응답 실패")))

    result = service.collect_date(target)

    assert result.is_err
    assert list(PriceRecord.objects.filter(date=target)) == [old]
    assert CollectionLog.objects.get(date=target).status == CollectionLog.Status.FAILURE


@pytest.mark.django_db
def test_collect_sorts_dates_from_recent_to_past():
    client = StubPageClient([row()])
    service = CollectionService(client)

    service.collect([date(2026, 7, 20), date(2026, 7, 22), date(2026, 7, 21)])

    assert client.requested_dates == [
        date(2026, 7, 22),
        date(2026, 7, 21),
        date(2026, 7, 20),
    ]


@pytest.mark.django_db
def test_insert_failure_rolls_back_the_date_delete():
    target = date(2026, 7, 24)
    old = PriceRecord.objects.create(
        date=target,
        species="기존",
        status="선",
        origin="부산",
        spec="대",
        packaging="상자",
        quantity=1,
        price_high=1,
        price_low=1,
        price_avg=1,
    )
    service = CollectionService(StubPageClient([row()]))

    with patch.object(
        PriceRecord.objects,
        "bulk_create",
        side_effect=DatabaseError("삽입 실패"),
    ):
        with pytest.raises(DatabaseError):
            service.collect_date(target)

    assert list(PriceRecord.objects.filter(date=target)) == [old]
    assert not CollectionLog.objects.filter(date=target).exists()


def collection_success(target_date, holiday=False):
    return Result.ok(
        CollectionSuccess(
            date=target_date,
            row_count=0 if holiday else 1,
            is_holiday=holiday,
            expected_holiday=holiday,
        )
    )


@pytest.mark.django_db
def test_daily_backfill_continues_past_holidays_and_failures():
    today = date(2026, 7, 27)
    service = CollectionService(StubPageClient())

    def collect_date(target_date):
        if target_date == date(2026, 7, 25):
            return collection_success(target_date, holiday=True)
        if target_date == date(2026, 7, 24):
            return Result.err(CollectionFailure(target_date, "수집 실패"))
        return collection_success(target_date)

    service.collect_date = Mock(side_effect=collect_date)

    result = service.collect_daily(today=today, backfill_business_days=2)

    assert [call.args[0] for call in service.collect_date.call_args_list] == [
        date(2026, 7, 26),
        date(2026, 7, 25),
        date(2026, 7, 24),
        date(2026, 7, 23),
        date(2026, 7, 22),
    ]
    assert result.backfill.succeeded == 3
    assert result.backfill.failed == 1


@pytest.mark.django_db
def test_daily_backfill_skips_completed_dates_and_moves_recent_to_past():
    today = date(2026, 7, 27)
    CollectionLog.objects.create(
        date=date(2026, 7, 25),
        status=CollectionLog.Status.SUCCESS,
        row_count=1,
    )
    service = CollectionService(StubPageClient())
    service.collect_date = Mock(
        side_effect=lambda target_date: collection_success(target_date)
    )

    service.collect_daily(today=today, backfill_business_days=2)

    assert [call.args[0] for call in service.collect_date.call_args_list] == [
        date(2026, 7, 26),
        date(2026, 7, 24),
        date(2026, 7, 23),
    ]


@pytest.mark.django_db
def test_daily_backfill_never_requests_before_the_year_cutoff():
    today = date(2026, 7, 27)
    cutoff = today - timedelta(days=366)
    service = CollectionService(StubPageClient())
    service.collect_date = Mock(
        side_effect=lambda target_date: Result.err(
            CollectionFailure(target_date, "수집 실패")
        )
    )

    service.collect_daily(
        today=today,
        backfill_business_days=500,
        backfill_years=1,
    )

    requested = [
        call.args[0] for call in service.collect_date.call_args_list[1:]
    ]
    assert min(requested) == cutoff
    assert all(target_date >= cutoff for target_date in requested)
