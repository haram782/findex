from django.core.management.base import BaseCommand, CommandError

from collector.services import SpeciesProfileService


class Command(BaseCommand):
    help = "독립 검증을 통과한 어종 정보만 발행(공개) 상태로 전환합니다."

    def add_arguments(self, parser):
        parser.add_argument("species")

    def handle(self, *args, **options):
        result = SpeciesProfileService().publish(options["species"])
        if result.is_err:
            raise CommandError(result.error.message)
        self.stdout.write(f"발행 완료: {options['species']} (published)")
