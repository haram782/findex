import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterable

import holidays
from django.db import transaction
from django.utils import timezone

from collector.models import (
    CollectionLog,
    CollectionObservation,
    PriceRecord,
    SpeciesCatalog,
    SpeciesProfile,
)
from collector.page_client import MobilePricePageClient, PricePageClientError
from collector.parser import ParsedPriceRow, PriceTableParseError
from collector.result import Result

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CollectionSuccess:
    date: date
    row_count: int
    is_holiday: bool
    expected_holiday: bool


@dataclass(frozen=True)
class CollectionFailure:
    date: date
    message: str


@dataclass(frozen=True)
class CollectionBatch:
    results: tuple[Result[CollectionSuccess, CollectionFailure], ...]

    @property
    def succeeded(self) -> int:
        return sum(result.is_ok for result in self.results)

    @property
    def failed(self) -> int:
        return sum(result.is_err for result in self.results)


@dataclass(frozen=True)
class DailyCollection:
    latest: Result[CollectionSuccess, CollectionFailure]
    backfill: CollectionBatch


def is_expected_holiday(target_date: date) -> bool:
    if target_date.weekday() == 6:
        return True
    if (target_date.month, target_date.day) == (1, 1):
        return True
    holiday_name = holidays.KR(years=[target_date.year]).get(target_date, "")
    normalized_name = str(holiday_name).lower()
    lunar_market_holidays = (
        "seollal",
        "korean new year",
        "lunar new year",
        "chuseok",
        "설날",
        "추석",
    )
    return any(name in normalized_name for name in lunar_market_holidays)


class CollectionService:
    def __init__(self, page_client: MobilePricePageClient | None = None):
        self.page_client = page_client or MobilePricePageClient()

    def _warn_unknown_species(self, rows: tuple[ParsedPriceRow, ...]) -> None:
        names = {row.species for row in rows}
        official = set(
            SpeciesCatalog.objects.filter(species__in=names).values_list(
                "species",
                flat=True,
            )
        )
        for species in sorted(names - official):
            logger.warning("공식 어종 목록에 없는 어종을 수집했습니다: %s", species)

    def _save_success(
        self,
        target_date: date,
        rows: tuple[ParsedPriceRow, ...],
        expected_holiday: bool,
    ) -> None:
        records = [
            PriceRecord(
                date=target_date,
                species=row.species,
                status=row.status,
                origin=row.origin,
                spec=row.spec,
                packaging=row.packaging,
                quantity=row.quantity,
                price_high=row.price_high,
                price_low=row.price_low,
                price_avg=row.price_avg,
            )
            for row in rows
        ]
        status = (
            CollectionLog.Status.SUCCESS
            if records
            else CollectionLog.Status.HOLIDAY
        )
        with transaction.atomic():
            PriceRecord.objects.filter(date=target_date).delete()
            PriceRecord.objects.bulk_create(records, batch_size=1000)
            CollectionLog.objects.update_or_create(
                date=target_date,
                defaults={
                    "status": status,
                    "row_count": len(records),
                    "expected_holiday": expected_holiday,
                    "error_message": "",
                },
            )

    def _save_failure(self, target_date: date, message: str) -> None:
        CollectionLog.objects.update_or_create(
            date=target_date,
            defaults={
                "status": CollectionLog.Status.FAILURE,
                "row_count": 0,
                "expected_holiday": is_expected_holiday(target_date),
                "error_message": message,
            },
        )

    def collect_date(
        self,
        target_date: date,
    ) -> Result[CollectionSuccess, CollectionFailure]:
        try:
            rows = self.page_client.fetch_date(target_date)
        except (PricePageClientError, PriceTableParseError) as error:
            message = str(error)
            self._save_failure(target_date, message)
            logger.exception("경락시세 수집에 실패했습니다: %s", target_date)
            return Result.err(CollectionFailure(target_date, message))

        expected_holiday = is_expected_holiday(target_date)
        self._warn_unknown_species(rows)
        self._save_success(target_date, rows, expected_holiday)
        return Result.ok(
            CollectionSuccess(
                date=target_date,
                row_count=len(rows),
                is_holiday=not rows,
                expected_holiday=expected_holiday,
            )
        )

    def collect(self, date_range: Iterable[date]) -> CollectionBatch:
        ordered_dates = sorted(set(date_range), reverse=True)
        return CollectionBatch(
            tuple(self.collect_date(target_date) for target_date in ordered_dates)
        )

    def observe(
        self,
        target_date: date,
    ) -> Result[CollectionSuccess, CollectionFailure]:
        try:
            rows = self.page_client.fetch_date(target_date)
        except (PricePageClientError, PriceTableParseError) as error:
            message = str(error)
            CollectionObservation.objects.create(
                date=target_date,
                row_count=0,
                succeeded=False,
                error_message=message,
            )
            return Result.err(CollectionFailure(target_date, message))

        expected_holiday = is_expected_holiday(target_date)
        CollectionObservation.objects.create(
            date=target_date,
            row_count=len(rows),
            succeeded=True,
        )
        return Result.ok(
            CollectionSuccess(
                date=target_date,
                row_count=len(rows),
                is_holiday=not rows,
                expected_holiday=expected_holiday,
            )
        )

    def collect_daily(
        self,
        today: date,
        backfill_business_days: int = 50,
        backfill_years: int = 5,
    ) -> DailyCollection:
        yesterday = today - timedelta(days=1)
        latest = self.collect_date(yesterday)
        completed_dates = set(
            CollectionLog.objects.filter(
                status__in=[
                    CollectionLog.Status.SUCCESS,
                    CollectionLog.Status.HOLIDAY,
                ],
                date__lt=yesterday,
            ).values_list("date", flat=True)
        )
        cutoff = today - timedelta(days=backfill_years * 366)
        cursor = yesterday - timedelta(days=1)
        results = []
        business_days = 0
        attempts = 0
        attempt_limit = backfill_business_days * 2 + 14
        while (
            cursor >= cutoff
            and business_days < backfill_business_days
            and attempts < attempt_limit
        ):
            if cursor not in completed_dates:
                result = self.collect_date(cursor)
                results.append(result)
                attempts += 1
                if result.is_ok and not result.value.is_holiday:
                    business_days += 1
            cursor -= timedelta(days=1)
        return DailyCollection(latest=latest, backfill=CollectionBatch(tuple(results)))


@dataclass(frozen=True)
class SpeciesProfileError:
    code: str
    message: str


class SpeciesProfileService:
    def save_draft(
        self,
        species: str,
        *,
        season: str = "",
        main_origins: list[str] | None = None,
        features: str = "",
        handling_notes: str = "",
        image_url: str = "",
        source_urls: list[str] | None = None,
        generated_by: str = "",
        generated_at=None,
    ) -> Result[SpeciesProfile, SpeciesProfileError]:
        if not PriceRecord.objects.filter(species=species).exists():
            return Result.err(
                SpeciesProfileError(
                    "unknown_species",
                    f"거래 기록이 없는 어종에는 프로필을 만들 수 없습니다: {species}",
                )
            )
        if not source_urls:
            return Result.err(
                SpeciesProfileError(
                    "source_required",
                    "출처 URL을 최소 1개 이상 지정해야 합니다.",
                )
            )
        profile, _ = SpeciesProfile.objects.update_or_create(
            species=species,
            defaults={
                "season": season,
                "main_origins": main_origins or [],
                "features": features,
                "handling_notes": handling_notes,
                "image_url": image_url,
                "source_urls": source_urls,
                "generated_by": generated_by,
                "generated_at": generated_at,
                "review_status": SpeciesProfile.ReviewStatus.DRAFT,
                "verification_status": SpeciesProfile.VerificationStatus.UNVERIFIED,
                "verification_notes": "",
                "verified_at": None,
            },
        )
        return Result.ok(profile)

    def publish(self, species: str) -> Result[SpeciesProfile, SpeciesProfileError]:
        try:
            profile = SpeciesProfile.objects.get(species=species)
        except SpeciesProfile.DoesNotExist:
            return Result.err(
                SpeciesProfileError(
                    "profile_not_found",
                    f"저장된 초안이 없는 어종입니다: {species}",
                )
            )
        if (
            profile.verification_status
            != SpeciesProfile.VerificationStatus.VERIFIED
        ):
            return Result.err(
                SpeciesProfileError(
                    "verification_required",
                    "독립 검증을 통과한 어종 정보만 발행할 수 있습니다.",
                )
            )
        profile.review_status = SpeciesProfile.ReviewStatus.PUBLISHED
        profile.reviewed_at = timezone.now()
        profile.save(update_fields=["review_status", "reviewed_at", "updated_at"])
        return Result.ok(profile)

    def verify(
        self,
        species: str,
        *,
        verified: bool,
        notes: str = "",
    ) -> Result[SpeciesProfile, SpeciesProfileError]:
        try:
            profile = SpeciesProfile.objects.get(species=species)
        except SpeciesProfile.DoesNotExist:
            return Result.err(
                SpeciesProfileError(
                    "profile_not_found",
                    f"저장된 초안이 없는 어종입니다: {species}",
                )
            )
        now = timezone.now()
        profile.verification_status = (
            SpeciesProfile.VerificationStatus.VERIFIED
            if verified
            else SpeciesProfile.VerificationStatus.FLAGGED
        )
        profile.verification_notes = notes
        profile.verified_at = now
        profile.review_status = (
            SpeciesProfile.ReviewStatus.PUBLISHED
            if verified
            else SpeciesProfile.ReviewStatus.DRAFT
        )
        profile.reviewed_at = now if verified else profile.reviewed_at
        profile.save(
            update_fields=[
                "verification_status",
                "verification_notes",
                "verified_at",
                "review_status",
                "reviewed_at",
                "updated_at",
            ]
        )
        return Result.ok(profile)
