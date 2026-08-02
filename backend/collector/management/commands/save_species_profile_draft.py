from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from collector.services import SpeciesProfileService


class Command(BaseCommand):
    help = "어종 정보 초안을 저장합니다(검수 전까지 비공개)."

    def add_arguments(self, parser):
        parser.add_argument("species")
        parser.add_argument("--season", default="")
        parser.add_argument("--main-origin", dest="main_origins", action="append", default=[])
        parser.add_argument("--features", default="")
        parser.add_argument("--handling-notes", default="")
        parser.add_argument("--image-url", default="")
        parser.add_argument("--source-url", dest="source_urls", action="append", default=[])
        parser.add_argument("--generated-by", default="")
        parser.add_argument(
            "--generated-at",
            type=datetime.fromisoformat,
            default=None,
        )

    def handle(self, *args, **options):
        result = SpeciesProfileService().save_draft(
            options["species"],
            season=options["season"],
            main_origins=options["main_origins"],
            features=options["features"],
            handling_notes=options["handling_notes"],
            image_url=options["image_url"],
            source_urls=options["source_urls"],
            generated_by=options["generated_by"],
            generated_at=options["generated_at"] or timezone.now(),
        )
        if result.is_err:
            raise CommandError(result.error.message)
        self.stdout.write(f"초안 저장 완료: {options['species']} (draft)")
