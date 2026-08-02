from django.core.management.base import BaseCommand, CommandError

from collector.services import SpeciesProfileService


class Command(BaseCommand):
    help = (
        "출처 대조 검증 결과를 기록합니다. 검증 통과 시 자동으로 발행됩니다"
        "(문제 발견 시에는 초안 상태로 남습니다)."
    )

    def add_arguments(self, parser):
        parser.add_argument("species")
        parser.add_argument(
            "--status",
            required=True,
            choices=["verified", "flagged"],
        )
        parser.add_argument("--notes", default="")

    def handle(self, *args, **options):
        verified = options["status"] == "verified"
        result = SpeciesProfileService().verify(
            options["species"],
            verified=verified,
            notes=options["notes"],
        )
        if result.is_err:
            raise CommandError(result.error.message)
        if verified:
            self.stdout.write(
                f"검증 완료: {options['species']} (verified, 자동 발행됨)"
            )
        else:
            self.stdout.write(
                f"검증 완료: {options['species']} (flagged, 발행 보류)"
            )
