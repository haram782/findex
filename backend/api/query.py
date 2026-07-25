from dataclasses import dataclass
from datetime import date, timedelta

from django.http import QueryDict
from django.utils import timezone

from collector.models import SpeciesCatalog
from collector.result import Result

MAX_SELECTIONS = 5


@dataclass(frozen=True)
class ApiQueryError:
    code: str
    message: str


@dataclass(frozen=True)
class SelectionQuery:
    selections: tuple[tuple[str, str | None, str | None], ...]
    group_by: str
    start_date: date
    end_date: date


@dataclass(frozen=True)
class CatalogQuery:
    search: str
    category: str | None
    statuses: tuple[str, ...]


@dataclass(frozen=True)
class SnapshotQuery:
    target_date: date
    explicit_date: bool


def _parse_date(
    value: str | None,
    default: date,
    field_name: str,
) -> Result[date, ApiQueryError]:
    if not value:
        return Result.ok(default)
    try:
        return Result.ok(date.fromisoformat(value))
    except ValueError:
        return Result.err(
            ApiQueryError(
                f"invalid_{field_name}",
                f"{field_name}는 YYYY-MM-DD 형식이어야 합니다.",
            )
        )


def parse_selection_query(
    params: QueryDict,
    require_species: bool = True,
) -> Result[SelectionQuery, ApiQueryError]:
    species = tuple(value.strip() for value in params.getlist("species") if value.strip())
    statuses = tuple(value.strip() for value in params.getlist("status"))
    price_units = tuple(value.strip() for value in params.getlist("price_unit"))
    if require_species and not species:
        return Result.err(
            ApiQueryError("species_required", "species를 하나 이상 지정해야 합니다.")
        )
    if len(species) > MAX_SELECTIONS:
        return Result.err(
            ApiQueryError(
                "selection_limit_exceeded",
                f"species는 최대 {MAX_SELECTIONS}개까지 지정할 수 있습니다.",
            )
        )
    if statuses and len(statuses) != len(species):
        return Result.err(
            ApiQueryError(
                "invalid_selection",
                "species와 status는 같은 개수의 선택 쌍이어야 합니다.",
            )
        )
    if price_units and len(price_units) != len(species):
        return Result.err(
            ApiQueryError(
                "invalid_selection",
                "species와 price_unit은 같은 개수의 선택 쌍이어야 합니다.",
            )
        )
    selections = tuple(
        (
            name,
            statuses[index] if statuses else None,
            price_units[index] if price_units else None,
        )
        for index, name in enumerate(species)
    )
    group_by = params.get("group_by", "none")
    if group_by not in {"none", "origin", "spec"}:
        return Result.err(
            ApiQueryError(
                "invalid_group_by",
                "group_by는 none, origin, spec 중 하나여야 합니다.",
            )
        )
    today = timezone.localdate()
    end_result = _parse_date(params.get("end_date"), today, "end_date")
    if end_result.is_err:
        return Result.err(end_result.error)
    start_result = _parse_date(
        params.get("start_date"),
        end_result.value - timedelta(days=90),
        "start_date",
    )
    if start_result.is_err:
        return Result.err(start_result.error)
    if start_result.value > end_result.value:
        return Result.err(
            ApiQueryError(
                "invalid_date_range",
                "start_date는 end_date보다 늦을 수 없습니다.",
            )
        )
    return Result.ok(
        SelectionQuery(
            selections=selections,
            group_by=group_by,
            start_date=start_result.value,
            end_date=end_result.value,
        )
    )


def parse_catalog_query(params: QueryDict) -> Result[CatalogQuery, ApiQueryError]:
    category = params.get("category") or None
    valid_categories = {choice for choice, _ in SpeciesCatalog.Category.choices}
    if category and category not in valid_categories:
        return Result.err(
            ApiQueryError(
                "invalid_category",
                "지원하지 않는 category입니다.",
            )
        )
    return Result.ok(
        CatalogQuery(
            search=params.get("search", "").strip(),
            category=category,
            statuses=tuple(params.getlist("status")),
        )
    )


def parse_snapshot_query(
    params: QueryDict,
) -> Result[SnapshotQuery, ApiQueryError]:
    parsed_date = _parse_date(
        params.get("date"),
        timezone.localdate(),
        "date",
    )
    if parsed_date.is_err:
        return Result.err(parsed_date.error)
    return Result.ok(
        SnapshotQuery(
            target_date=parsed_date.value,
            explicit_date=bool(params.get("date")),
        )
    )
