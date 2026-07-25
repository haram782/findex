import os

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from collector.services import CollectionService


class Command(BaseCommand):
    help = "어제 데이터와 최근 우선 과거 데이터를 함께 수집합니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--backfill-days",
            type=int,
            default=int(os.getenv("BACKFILL_DAYS_PER_RUN", "50")),
        )
        parser.add_argument("--backfill-years", type=int, default=5)

    def handle(self, *args, **options):
        backfill_days = options["backfill_days"]
        backfill_years = options["backfill_years"]
        if backfill_days < 0 or backfill_years < 1:
            raise CommandError("백필 일수와 연수는 유효한 양수여야 합니다.")
        result = CollectionService().collect_daily(
            today=timezone.localdate(),
            backfill_business_days=backfill_days,
            backfill_years=backfill_years,
        )
        latest_failed = result.latest.is_err
        self.stdout.write(
            "데일리 수집 완료: "
            f"최신 {'실패' if latest_failed else '성공'}, "
            f"백필 성공 {result.backfill.succeeded}일, "
            f"백필 실패 {result.backfill.failed}일"
        )
        if latest_failed or result.backfill.failed:
            raise CommandError("일부 날짜 수집에 실패했습니다.")
