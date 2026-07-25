from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from collector.services import CollectionService


class Command(BaseCommand):
    help = "오늘 데이터의 확정 시각을 관찰하기 위해 행 수만 기록합니다."

    def add_arguments(self, parser):
        parser.add_argument("--date", dest="target_date", type=date.fromisoformat)

    def handle(self, *args, **options):
        target_date = options["target_date"] or timezone.localdate()
        result = CollectionService().observe(target_date)
        if result.is_err:
            raise CommandError(result.error.message)
        self.stdout.write(
            f"관찰 완료: {target_date.isoformat()} {result.value.row_count}행"
        )
