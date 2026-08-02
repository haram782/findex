from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import (
    DecimalField,
    ExpressionWrapper,
    F,
    Max,
    Min,
    Q,
    Sum,
)
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.query import (
    parse_catalog_query,
    parse_selection_query,
    parse_snapshot_query,
)
from collector.models import PriceRecord, SpeciesCatalog, SpeciesProfile

MONEY_FIELD = DecimalField(max_digits=32, decimal_places=5)


def _error_response(error) -> Response:
    return Response(
        {"code": error.code, "message": error.message},
        status=400,
    )


def _number(value: Decimal | None):
    if value is None:
        return None
    if value == value.to_integral_value():
        return int(value)
    return float(value)


def _rounded_price(value: Decimal | None):
    if value is None:
        return None
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _category_map(species_names) -> dict[str, str]:
    return dict(
        SpeciesCatalog.objects.filter(species__in=species_names).values_list(
            "species",
            "category",
        )
    )


def _selection_filter(selections) -> Q:
    query = Q()
    for species, status, price_unit in selections:
        pair = Q(species=species)
        if status is not None:
            pair &= Q(status=status)
        if price_unit is not None:
            pair &= Q(packaging=price_unit)
        query |= pair
    return query


def _aggregate(queryset, group_fields):
    trade_expression = ExpressionWrapper(
        F("quantity") * F("price_avg"),
        output_field=MONEY_FIELD,
    )
    return (
        queryset.values(*group_fields)
        .annotate(
            quantity_total=Sum("quantity"),
            trade_amount=Sum(trade_expression),
            price_high_value=Max("price_high"),
            price_low_value=Min("price_low"),
        )
        .order_by(*group_fields)
    )


class CatalogView(APIView):
    def get(self, request: Request) -> Response:
        parsed = parse_catalog_query(request.query_params)
        if parsed.is_err:
            return _error_response(parsed.error)
        query = parsed.value
        catalog = SpeciesCatalog.objects.all()
        if query.category:
            catalog = catalog.filter(category=query.category)
            allowed_species = dict(catalog.values_list("species", "category"))
            records = PriceRecord.objects.filter(species__in=allowed_species)
        else:
            records = PriceRecord.objects.all()
            allowed_species = _category_map(
                records.values_list("species", flat=True).distinct()
            )

        if query.search:
            records = records.filter(species__icontains=query.search)
        if query.statuses:
            records = records.filter(status__in=query.statuses)
        pairs = records.values_list("species", "status").distinct().order_by(
            "species",
            "status",
        )
        return Response(
            {
                "results": [
                    {
                        "species": species,
                        "status": status,
                        "category": allowed_species.get(species, "other"),
                    }
                    for species, status in pairs
                ]
            }
        )


class TimeSeriesView(APIView):
    def get(self, request: Request) -> Response:
        parsed = parse_selection_query(request.query_params)
        if parsed.is_err:
            return _error_response(parsed.error)
        query = parsed.value
        records = PriceRecord.objects.filter(
            _selection_filter(query.selections),
            date__range=(query.start_date, query.end_date),
        )
        group_fields = ["date", "species", "packaging"]
        status_specific = all(
            status is not None for _, status, _ in query.selections
        )
        if status_specific:
            group_fields.append("status")
        if query.group_by != "none":
            group_fields.append(query.group_by)

        results = []
        for aggregate in _aggregate(records, group_fields):
            quantity = aggregate["quantity_total"] or Decimal(0)
            trade_amount = aggregate["trade_amount"] or Decimal(0)
            average = trade_amount / quantity if quantity else None
            results.append(
                {
                    "date": aggregate["date"].isoformat(),
                    "species": aggregate["species"],
                    "status": aggregate.get("status"),
                    "group": (
                        aggregate[query.group_by]
                        if query.group_by != "none"
                        else None
                    ),
                    "price_avg": _rounded_price(average),
                    "price_high": _number(aggregate["price_high_value"]),
                    "price_low": _number(aggregate["price_low_value"]),
                    "quantity": _number(quantity),
                    "trade_value": _number(trade_amount),
                    "price_unit": aggregate["packaging"],
                }
            )
        return Response({"results": results})


class SpeciesProfileView(APIView):
    def get(self, request: Request, species: str) -> Response:
        profile = SpeciesProfile.objects.filter(
            species=species,
            review_status=SpeciesProfile.ReviewStatus.PUBLISHED,
            verification_status=SpeciesProfile.VerificationStatus.VERIFIED,
        ).first()
        if profile is None:
            return Response(
                {"code": "not_found", "message": "발행된 어종 정보가 없습니다."},
                status=404,
            )
        return Response(
            {
                "species": profile.species,
                "season": profile.season,
                "main_origins": profile.main_origins,
                "features": profile.features,
                "handling_notes": profile.handling_notes,
                "image_url": profile.image_url,
                "source_urls": profile.source_urls,
                "generated_by": profile.generated_by,
                "generated_at": (
                    profile.generated_at.isoformat() if profile.generated_at else None
                ),
                "review_status": profile.review_status,
                "reviewed_at": (
                    profile.reviewed_at.isoformat() if profile.reviewed_at else None
                ),
            }
        )


def _snapshot_rows(target_date: date):
    return _aggregate(
        PriceRecord.objects.filter(date=target_date),
        ["species", "status", "packaging"],
    )


class SnapshotView(APIView):
    def get(self, request: Request) -> Response:
        parsed = parse_snapshot_query(request.query_params)
        if parsed.is_err:
            return _error_response(parsed.error)
        target_date = parsed.value.target_date
        if not parsed.value.explicit_date:
            latest_date = (
                PriceRecord.objects.order_by("-date")
                .values_list("date", flat=True)
                .first()
            )
            if latest_date:
                target_date = latest_date

        previous_date = (
            PriceRecord.objects.filter(date__lt=target_date)
            .order_by("-date")
            .values_list("date", flat=True)
            .first()
        )
        previous = {}
        if previous_date:
            for aggregate in _snapshot_rows(previous_date):
                quantity = aggregate["quantity_total"] or Decimal(0)
                previous[
                    (
                        aggregate["species"],
                        aggregate["status"],
                        aggregate["packaging"],
                    )
                ] = (
                    aggregate["trade_amount"] / quantity if quantity else None
                )

        current_rows = list(_snapshot_rows(target_date))
        categories = _category_map(row["species"] for row in current_rows)
        results = []
        for aggregate in current_rows:
            quantity = aggregate["quantity_total"] or Decimal(0)
            trade_amount = aggregate["trade_amount"] or Decimal(0)
            average = trade_amount / quantity if quantity else None
            previous_average = previous.get(
                (
                    aggregate["species"],
                    aggregate["status"],
                    aggregate["packaging"],
                )
            )
            change_rate = None
            if (
                average is not None
                and previous_average is not None
                and previous_average != 0
            ):
                change_rate = round(
                    float((average - previous_average) / previous_average * 100),
                    2,
                )
            results.append(
                {
                    "species": aggregate["species"],
                    "status": aggregate["status"],
                    "category": categories.get(aggregate["species"], "other"),
                    "price_avg": _rounded_price(average),
                    "change_rate": change_rate,
                    "quantity": _number(quantity),
                    "trade_value": _number(trade_amount),
                    "price_unit": aggregate["packaging"],
                }
            )
        results.sort(
            key=lambda item: (
                item["change_rate"] is None,
                item["change_rate"] or 0,
                item["species"],
                item["status"],
            )
        )
        return Response(
            {
                "date": target_date.isoformat(),
                "previous_date": (
                    previous_date.isoformat() if previous_date else None
                ),
                "results": results,
            }
        )
