from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError

from collector.services import CollectionService


def inclusive_dates(start: date, end: date):
    cursor = start
    while cursor <= end:
        yield cursor
        cursor += timedelta(days=1)


class Command(BaseCommand):
    help = "지정 날짜 또는 날짜 범위의 경락시세를 수집합니다."

    def add_arguments(self, parser):
        parser.add_argument("date", nargs="?", type=date.fromisoformat)
        parser.add_argument("--date", dest="explicit_date", type=date.fromisoformat)
        parser.add_argument("--start", type=date.fromisoformat)
        parser.add_argument("--end", type=date.fromisoformat)

    def handle(self, *args, **options):
        target_date = options["explicit_date"] or options["date"]
        start = options["start"]
        end = options["end"]
        if target_date and (start or end):
            raise CommandError("--date와 --start/--end는 함께 사용할 수 없습니다.")
        if target_date:
            dates = [target_date]
        elif start and end:
            if start > end:
                raise CommandError("--start는 --end보다 늦을 수 없습니다.")
            dates = inclusive_dates(start, end)
        else:
            raise CommandError("--date 또는 --start와 --end를 지정해야 합니다.")

        batch = CollectionService().collect(dates)
        self.stdout.write(
            f"수집 완료: 성공 {batch.succeeded}일, 실패 {batch.failed}일"
        )
        if batch.failed:
            raise CommandError("일부 날짜 수집에 실패했습니다.")
