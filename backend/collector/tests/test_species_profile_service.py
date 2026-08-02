from datetime import date, datetime, timezone as dt_timezone

import pytest

from collector.models import PriceRecord, SpeciesProfile
from collector.services import SpeciesProfileService


def create_record(species="전복", target=date(2026, 7, 24)):
    return PriceRecord.objects.create(
        date=target,
        species=species,
        status="활",
        origin="완도",
        spec="10미",
        packaging="1kg",
        quantity=1,
        price_high=12000,
        price_low=8000,
        price_avg=10000,
    )


def draft_kwargs(**overrides):
    defaults = dict(
        season="가을~겨울",
        main_origins=["완도", "제주"],
        features="맛이 좋다",
        handling_notes="손질 후 냉장 보관",
        image_url="",
        source_urls=["https://example.com/source"],
        generated_by="claude-sonnet-5",
        generated_at=datetime(2026, 7, 27, tzinfo=dt_timezone.utc),
    )
    defaults.update(overrides)
    return defaults


@pytest.mark.django_db
def test_save_draft_creates_a_profile_in_draft_status():
    create_record()
    service = SpeciesProfileService()

    result = service.save_draft("전복", **draft_kwargs())

    assert result.is_ok
    profile = SpeciesProfile.objects.get(species="전복")
    assert profile.review_status == SpeciesProfile.ReviewStatus.DRAFT
    assert profile.season == "가을~겨울"
    assert profile.source_urls == ["https://example.com/source"]


@pytest.mark.django_db
def test_save_draft_rejects_species_with_no_price_history():
    service = SpeciesProfileService()

    result = service.save_draft("존재하지않는어종", **draft_kwargs())

    assert result.is_err
    assert result.error.code == "unknown_species"
    assert not SpeciesProfile.objects.filter(species="존재하지않는어종").exists()


@pytest.mark.django_db
def test_save_draft_rejects_empty_source_urls():
    create_record()
    service = SpeciesProfileService()

    result = service.save_draft("전복", **draft_kwargs(source_urls=[]))

    assert result.is_err
    assert result.error.code == "source_required"


@pytest.mark.django_db
def test_save_draft_upserts_existing_profile_instead_of_duplicating():
    create_record()
    service = SpeciesProfileService()
    service.save_draft("전복", **draft_kwargs())

    result = service.save_draft("전복", **draft_kwargs(season="봄"))

    assert result.is_ok
    assert SpeciesProfile.objects.filter(species="전복").count() == 1
    assert SpeciesProfile.objects.get(species="전복").season == "봄"


@pytest.mark.django_db
def test_updating_a_published_profile_resets_it_to_draft():
    create_record()
    service = SpeciesProfileService()
    service.save_draft("전복", **draft_kwargs())
    service.verify("전복", verified=True, notes="출처와 대조 완료")

    service.save_draft("전복", **draft_kwargs(season="봄"))

    profile = SpeciesProfile.objects.get(species="전복")
    assert profile.review_status == SpeciesProfile.ReviewStatus.DRAFT


@pytest.mark.django_db
def test_publish_marks_profile_published_with_reviewed_at():
    create_record()
    service = SpeciesProfileService()
    service.save_draft("전복", **draft_kwargs())
    profile = SpeciesProfile.objects.get(species="전복")
    profile.verification_status = SpeciesProfile.VerificationStatus.VERIFIED
    profile.save(update_fields=["verification_status"])

    result = service.publish("전복")

    assert result.is_ok
    profile = SpeciesProfile.objects.get(species="전복")
    assert profile.review_status == SpeciesProfile.ReviewStatus.PUBLISHED
    assert profile.reviewed_at is not None


@pytest.mark.django_db
def test_publish_rejects_an_unverified_profile():
    create_record()
    service = SpeciesProfileService()
    service.save_draft("전복", **draft_kwargs())

    result = service.publish("전복")

    assert result.is_err
    assert result.error.code == "verification_required"
    assert SpeciesProfile.objects.get(
        species="전복"
    ).review_status == SpeciesProfile.ReviewStatus.DRAFT


@pytest.mark.django_db
def test_publish_fails_when_no_profile_exists():
    service = SpeciesProfileService()

    result = service.publish("전복")

    assert result.is_err
    assert result.error.code == "profile_not_found"


@pytest.mark.django_db
def test_save_draft_resets_verification_status_on_every_save():
    create_record()
    service = SpeciesProfileService()
    service.save_draft("전복", **draft_kwargs())
    service.verify("전복", verified=True, notes="출처와 대조 완료")

    service.save_draft("전복", **draft_kwargs(season="봄"))

    profile = SpeciesProfile.objects.get(species="전복")
    assert profile.verification_status == SpeciesProfile.VerificationStatus.UNVERIFIED
    assert profile.verification_notes == ""
    assert profile.verified_at is None


@pytest.mark.django_db
def test_verify_marks_verified_and_auto_publishes():
    create_record()
    service = SpeciesProfileService()
    service.save_draft("전복", **draft_kwargs())

    result = service.verify("전복", verified=True, notes="출처와 대조 완료")

    assert result.is_ok
    profile = SpeciesProfile.objects.get(species="전복")
    assert profile.verification_status == SpeciesProfile.VerificationStatus.VERIFIED
    assert profile.verification_notes == "출처와 대조 완료"
    assert profile.verified_at is not None
    assert profile.review_status == SpeciesProfile.ReviewStatus.PUBLISHED
    assert profile.reviewed_at is not None


@pytest.mark.django_db
def test_verify_marks_flagged_without_publishing():
    create_record()
    service = SpeciesProfileService()
    service.save_draft("전복", **draft_kwargs())

    result = service.verify("전복", verified=False, notes="제철 문장이 출처와 불일치")

    assert result.is_ok
    profile = SpeciesProfile.objects.get(species="전복")
    assert profile.verification_status == SpeciesProfile.VerificationStatus.FLAGGED
    assert profile.verification_notes == "제철 문장이 출처와 불일치"
    assert profile.review_status == SpeciesProfile.ReviewStatus.DRAFT


@pytest.mark.django_db
def test_verify_flagged_revokes_publication_of_already_published_profile():
    create_record()
    service = SpeciesProfileService()
    service.save_draft("전복", **draft_kwargs())
    service.verify("전복", verified=True, notes="1차 검증 통과")

    result = service.verify("전복", verified=False, notes="재검증에서 불일치 발견")

    assert result.is_ok
    profile = SpeciesProfile.objects.get(species="전복")
    assert profile.verification_status == SpeciesProfile.VerificationStatus.FLAGGED
    assert profile.review_status == SpeciesProfile.ReviewStatus.DRAFT


@pytest.mark.django_db
def test_verify_fails_when_no_profile_exists():
    service = SpeciesProfileService()

    result = service.verify("전복", verified=True, notes="")

    assert result.is_err
    assert result.error.code == "profile_not_found"
