from datetime import date
from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from collector.models import PriceRecord, SpeciesCatalog


def create_record(
    target,
    species="전복",
    status="활",
    origin="완도",
    spec="10미",
    packaging="1kg",
    quantity=1,
    high=12000,
    low=8000,
    average=10000,
):
    return PriceRecord.objects.create(
        date=target,
        species=species,
        status=status,
        origin=origin,
        spec=spec,
        packaging=packaging,
        quantity=quantity,
        price_high=high,
        price_low=low,
        price_avg=average,
    )


@pytest.mark.django_db
def test_catalog_lists_species_status_and_category():
    SpeciesCatalog.objects.update_or_create(
        species="전복",
        defaults={"category": "shellfish"},
    )
    create_record(date(2026, 7, 24))

    response = APIClient().get("/api/v1/catalog/", {"search": "전"})

    assert response.status_code == 200
    assert response.json() == {
        "results": [{"species": "전복", "status": "활", "category": "shellfish"}]
    }


@pytest.mark.django_db
def test_timeseries_uses_weighted_average_and_price_envelope():
    target = date(2026, 7, 24)
    create_record(target, quantity=1, high=15000, low=7000, average=10000)
    create_record(
        target,
        origin="제주",
        quantity=3,
        high=14000,
        low=8000,
        average=20000,
    )

    response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "start_date": "2026-07-24",
            "end_date": "2026-07-24",
        },
    )

    assert response.status_code == 200
    point = response.json()["results"][0]
    assert point["price_avg"] == 17500
    assert point["status"] is None
    assert point["price_high"] == 15000
    assert point["price_low"] == 7000
    assert point["quantity"] == 4
    assert point["trade_value"] == 70000
    assert point["price_unit"] == "1kg"


@pytest.mark.django_db
def test_timeseries_keeps_different_packaging_units_separate():
    target = date(2026, 7, 24)
    create_record(target, packaging="kg", quantity=1, average=10000)
    create_record(
        target,
        origin="제주",
        packaging="box",
        quantity=3,
        average=20000,
    )

    response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "status": "활",
            "start_date": "2026-07-24",
            "end_date": "2026-07-24",
        },
    )

    assert response.status_code == 200
    assert [
        (item["price_unit"], item["price_avg"], item["quantity"])
        for item in response.json()["results"]
    ] == [("box", 20000, 3), ("kg", 10000, 1)]


@pytest.mark.django_db
def test_timeseries_filters_the_selected_packaging_unit():
    target = date(2026, 7, 24)
    create_record(target, packaging="kg", average=10000)
    create_record(target, packaging="box", average=20000)

    response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "status": "활",
            "price_unit": "kg",
            "start_date": "2026-07-24",
            "end_date": "2026-07-24",
        },
    )

    assert response.status_code == 200
    assert response.json()["results"] == [
        {
            "date": "2026-07-24",
            "species": "전복",
            "status": "활",
            "group": None,
            "price_avg": 10000,
            "price_high": 12000,
            "price_low": 8000,
            "quantity": 1,
            "trade_value": 10000,
            "price_unit": "kg",
        }
    ]


@pytest.mark.django_db
def test_timeseries_exposes_and_filters_an_unknown_packaging_unit():
    target = date(2026, 7, 24)
    create_record(target, packaging="", average=10000)
    create_record(target, packaging="미상", average=20000)

    blank_response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "status": "활",
            "price_unit": "",
            "start_date": "2026-07-24",
            "end_date": "2026-07-24",
        },
    )
    literal_response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "status": "활",
            "price_unit": "미상",
            "start_date": "2026-07-24",
            "end_date": "2026-07-24",
        },
    )

    assert blank_response.status_code == 200
    assert blank_response.json()["results"] == [
        {
            "date": "2026-07-24",
            "species": "전복",
            "status": "활",
            "group": None,
            "price_avg": 10000,
            "price_high": 12000,
            "price_low": 8000,
            "quantity": 1,
            "trade_value": 10000,
            "price_unit": "",
        }
    ]
    assert literal_response.status_code == 200
    assert literal_response.json()["results"][0]["price_avg"] == 20000
    assert literal_response.json()["results"][0]["price_unit"] == "미상"


@pytest.mark.django_db
def test_timeseries_can_group_by_origin_and_compare_species():
    target = date(2026, 7, 24)
    create_record(target, species="전복", origin="완도")
    create_record(target, species="전복", origin="제주")
    create_record(target, species="광어", origin="제주")

    response = APIClient().get(
        "/api/v1/timeseries/?species=전복&species=광어&group_by=origin"
        "&start_date=2026-07-24&end_date=2026-07-24"
    )

    assert response.status_code == 200
    assert {
        (item["species"], item["group"])
        for item in response.json()["results"]
    } == {("전복", "완도"), ("전복", "제주"), ("광어", "제주")}


@pytest.mark.django_db
def test_timeseries_rejects_invalid_group_by_as_business_result():
    response = APIClient().get(
        "/api/v1/timeseries/",
        {"species": "전복", "group_by": "status"},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_group_by"


def test_timeseries_rejects_misaligned_price_unit_selection_as_business_result():
    response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "price_unit": ["kg", "box"],
        },
    )

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_selection"


@pytest.mark.django_db
def test_snapshot_compares_with_previous_trading_day():
    create_record(date(2026, 7, 24), average=8000, quantity=2)
    create_record(date(2026, 7, 27), average=10000, quantity=1)
    create_record(date(2026, 7, 27), average=20000, quantity=3)

    response = APIClient().get("/api/v1/snapshot/", {"date": "2026-07-27"})

    assert response.status_code == 200
    body = response.json()
    assert body["date"] == "2026-07-27"
    assert body["previous_date"] == "2026-07-24"
    assert body["results"][0]["price_avg"] == 17500
    assert body["results"][0]["change_rate"] == 118.75
    assert body["results"][0]["trade_value"] == 70000
    assert body["results"][0]["price_unit"] == "1kg"


@pytest.mark.django_db
def test_snapshot_omits_change_rate_when_price_unit_changes():
    create_record(date(2026, 7, 24), packaging="kg", average=10000)
    create_record(date(2026, 7, 27), packaging="box", average=20000)

    response = APIClient().get("/api/v1/snapshot/", {"date": "2026-07-27"})

    assert response.status_code == 200
    result = response.json()["results"][0]
    assert result["price_unit"] == "box"
    assert result["change_rate"] is None


@pytest.mark.django_db
def test_snapshot_keeps_same_species_status_packaging_units_separate():
    target = date(2026, 7, 27)
    create_record(target, packaging="kg", average=10000)
    create_record(target, packaging="box", average=20000)

    response = APIClient().get("/api/v1/snapshot/", {"date": target.isoformat()})

    assert response.status_code == 200
    assert sorted(
        (item["price_unit"], item["price_avg"])
        for item in response.json()["results"]
    ) == [("box", 20000), ("kg", 10000)]


@pytest.mark.django_db
def test_timeseries_without_status_aggregates_the_whole_species():
    target = date(2026, 7, 24)
    create_record(
        target,
        status="활",
        quantity=1,
        average=10000,
    )
    create_record(
        target,
        status="선",
        quantity=3,
        average=20000,
    )

    response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "start_date": "2026-07-24",
            "end_date": "2026-07-24",
        },
    )

    assert response.status_code == 200
    assert response.json()["results"] == [
        {
            "date": "2026-07-24",
            "species": "전복",
            "status": None,
            "group": None,
            "price_avg": 17500,
            "price_high": 12000,
            "price_low": 8000,
            "quantity": 4,
            "trade_value": 70000,
            "price_unit": "1kg",
        }
    ]


@pytest.mark.django_db
def test_timeseries_returns_null_average_for_zero_quantity():
    target = date(2026, 7, 24)
    create_record(target, quantity=0, average=10000)

    response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "status": "활",
            "start_date": "2026-07-24",
            "end_date": "2026-07-24",
        },
    )

    point = response.json()["results"][0]
    assert point["quantity"] == 0
    assert point["price_avg"] is None
    assert point["trade_value"] == 0


@pytest.mark.django_db
def test_timeseries_rounds_half_won_average_up_to_an_integer():
    target = date(2026, 7, 24)
    create_record(target, quantity=1, average=10000)
    create_record(target, quantity=1, average=10001)

    response = APIClient().get(
        "/api/v1/timeseries/",
        {
            "species": "전복",
            "status": "활",
            "start_date": "2026-07-24",
            "end_date": "2026-07-24",
        },
    )

    assert response.status_code == 200
    assert response.json()["results"][0]["price_avg"] == 10001


@pytest.mark.django_db
def test_snapshot_rounds_average_price_to_an_integer():
    target = date(2026, 7, 24)
    create_record(target, quantity=1, average=10000)
    create_record(target, quantity=1, average=10001)

    response = APIClient().get(
        "/api/v1/snapshot/",
        {"date": "2026-07-24"},
    )

    assert response.status_code == 200
    assert response.json()["results"][0]["price_avg"] == 10001


@pytest.mark.django_db
def test_snapshot_defaults_to_the_latest_stored_trading_day():
    create_record(date(2026, 7, 24), average=8000)
    create_record(date(2026, 7, 27), average=10000)

    response = APIClient().get("/api/v1/snapshot/")

    assert response.status_code == 200
    assert response.json()["date"] == "2026-07-27"
    assert response.json()["previous_date"] == "2026-07-24"


@pytest.mark.django_db
def test_snapshot_rejects_an_invalid_date_as_business_result():
    response = APIClient().get(
        "/api/v1/snapshot/",
        {"date": "not-a-date"},
    )

    assert response.status_code == 400
    assert response.json()["code"] == "invalid_date"


@pytest.mark.django_db
def test_timeseries_uses_kst_local_date_for_default_range():
    target = date(2026, 7, 27)
    create_record(target)

    with patch(
        "api.query.timezone.localdate",
        return_value=target,
    ):
        response = APIClient().get(
            "/api/v1/timeseries/",
            {"species": "전복", "status": "활"},
        )

    assert response.status_code == 200
    assert response.json()["results"][0]["date"] == "2026-07-27"


@pytest.mark.django_db
def test_timeseries_limits_species_comparison_to_five():
    response = APIClient().get(
        "/api/v1/timeseries/?" + "&".join(
            f"species=어종{index}" for index in range(6)
        )
    )

    assert response.status_code == 400
    assert response.json()["code"] == "selection_limit_exceeded"


@pytest.mark.django_db
def test_official_catalog_seed_contains_the_full_reference_list():
    assert SpeciesCatalog.objects.filter(is_official=True).count() >= 149
