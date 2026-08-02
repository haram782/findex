from datetime import date, datetime, timezone as dt_timezone

import pytest
from rest_framework.test import APIClient

from collector.models import PriceRecord, SpeciesProfile


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


def create_profile(
    species="전복",
    status=SpeciesProfile.ReviewStatus.PUBLISHED,
    verification_status=SpeciesProfile.VerificationStatus.VERIFIED,
):
    return SpeciesProfile.objects.create(
        species=species,
        season="가을~겨울",
        main_origins=["완도", "제주"],
        features="맛이 좋다",
        handling_notes="손질 후 냉장 보관",
        image_url="https://example.com/image.jpg",
        source_urls=["https://example.com/source"],
        generated_by="claude-sonnet-5",
        generated_at=datetime(2026, 7, 27, tzinfo=dt_timezone.utc),
        review_status=status,
        verification_status=verification_status,
        reviewed_at=datetime(2026, 7, 27, tzinfo=dt_timezone.utc) if status == SpeciesProfile.ReviewStatus.PUBLISHED else None,
    )


@pytest.mark.django_db
def test_species_profile_returns_published_profile_fields():
    create_record()
    create_profile()

    response = APIClient().get("/api/v1/species-profile/전복/")

    assert response.status_code == 200
    body = response.json()
    assert body["species"] == "전복"
    assert body["season"] == "가을~겨울"
    assert body["main_origins"] == ["완도", "제주"]
    assert body["features"] == "맛이 좋다"
    assert body["handling_notes"] == "손질 후 냉장 보관"
    assert body["source_urls"] == ["https://example.com/source"]
    assert body["review_status"] == "published"


@pytest.mark.django_db
def test_species_profile_hides_unpublished_draft():
    create_record()
    create_profile(status=SpeciesProfile.ReviewStatus.DRAFT)

    response = APIClient().get("/api/v1/species-profile/전복/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_species_profile_hides_published_but_unverified_profile():
    create_record()
    create_profile(
        verification_status=SpeciesProfile.VerificationStatus.UNVERIFIED
    )

    response = APIClient().get("/api/v1/species-profile/전복/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_species_profile_returns_404_when_missing():
    create_record()

    response = APIClient().get("/api/v1/species-profile/전복/")

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"
