import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from bs4 import BeautifulSoup, Tag

EXPECTED_HEADERS = (
    "어종",
    "산지",
    "규격",
    "포장",
    "수량",
    "낙찰고가",
    "낙찰저가",
    "평균가",
)
STATUS_PREFIXES = ("가공", "활", "선", "냉")
EMPTY_MARKERS = (
    "조회된 경락시세가 없습니다",
    "조회된 데이터가 없습니다",
    "조회 결과가 없습니다",
    "데이터가 없습니다",
)


class PriceTableParseError(ValueError):
    pass


@dataclass(frozen=True)
class ParsedPriceRow:
    species: str
    status: str
    origin: str
    spec: str
    packaging: str
    quantity: Decimal
    price_high: Decimal
    price_low: Decimal
    price_avg: Decimal


@dataclass(frozen=True)
class ParsedPricePage:
    rows: tuple[ParsedPriceRow, ...]
    total_pages: int


def _normalized_text(tag: Tag) -> str:
    return re.sub(r"\s+", "", tag.get_text(" ", strip=True))


def _find_price_table(soup: BeautifulSoup) -> Tag:
    expected = set(EXPECTED_HEADERS)
    for table in soup.find_all("table"):
        headers = {_normalized_text(cell) for cell in table.find_all("th")}
        if expected.issubset(headers):
            return table
    raise PriceTableParseError("예상한 경락시세 표를 찾을 수 없습니다.")


def _parse_decimal(value: str, field_name: str) -> Decimal:
    normalized = re.sub(r"[^0-9.\-]", "", value)
    if not normalized or normalized == "-":
        raise PriceTableParseError(f"{field_name} 숫자 형식이 올바르지 않습니다: {value!r}")
    try:
        return Decimal(normalized)
    except InvalidOperation as error:
        raise PriceTableParseError(
            f"{field_name} 숫자 형식이 올바르지 않습니다: {value!r}"
        ) from error


def _split_species(value: str) -> tuple[str, str]:
    normalized = re.sub(r"\s+", "", value)
    matched = re.match(r"^[\[\(\{]?(가공|활|선|냉)[\]\)\}]?(.*)$", normalized)
    if matched and matched.group(2):
        return matched.group(2), matched.group(1)
    return normalized, ""


def _parse_row(cells: list[Tag]) -> ParsedPriceRow:
    if len(cells) < len(EXPECTED_HEADERS):
        raise PriceTableParseError("경락시세 행의 열 개수가 올바르지 않습니다.")
    values = [cell.get_text(" ", strip=True) for cell in cells[:8]]
    species, status = _split_species(values[0])
    if not species:
        raise PriceTableParseError("어종명이 비어 있습니다.")
    return ParsedPriceRow(
        species=species,
        status=status,
        origin=values[1].strip(),
        spec=values[2].strip(),
        packaging=values[3].strip(),
        quantity=_parse_decimal(values[4], "수량"),
        price_high=_parse_decimal(values[5], "낙찰고가"),
        price_low=_parse_decimal(values[6], "낙찰저가"),
        price_avg=_parse_decimal(values[7], "평균가"),
    )


def _parse_total_pages(soup: BeautifulSoup) -> int:
    pages = {1}
    for field in soup.find_all("input"):
        name = str(field.get("name", "")).lower()
        field_id = str(field.get("id", "")).lower()
        if "totalpage" in name or "totalpage" in field_id:
            value = str(field.get("value", ""))
            if value.isdigit():
                pages.add(int(value))
    for anchor in soup.select(".pagination a, .paging a, .paginate a"):
        source = " ".join(
            [
                str(anchor.get("href", "")),
                str(anchor.get("onclick", "")),
                anchor.get_text(" ", strip=True),
            ]
        )
        for value in re.findall(r"(?:pageIndex=|\()(\d+)", source):
            pages.add(int(value))
        for value in re.findall(
            r"fnList\([^)]*,\s*['\"](\d+)['\"]\s*\)",
            source,
        ):
            pages.add(int(value))
        text = anchor.get_text(strip=True)
        if text.isdigit():
            pages.add(int(text))
    for container in soup.select(".pagination, .paging, .paginate"):
        for _, total in re.findall(
            r"(\d+)\s*/\s*(\d+)",
            container.get_text(" ", strip=True),
        ):
            pages.add(int(total))
    return max(pages)


def parse_price_page(html: str) -> ParsedPricePage:
    soup = BeautifulSoup(html, "html.parser")
    table = _find_price_table(soup)
    rows = []
    for row in table.find_all("tr"):
        cells = row.find_all("td", recursive=False)
        if not cells:
            continue
        row_text = row.get_text(" ", strip=True)
        if any(marker in row_text for marker in EMPTY_MARKERS):
            continue
        rows.append(_parse_row(cells))
    return ParsedPricePage(
        rows=tuple(rows),
        total_pages=_parse_total_pages(soup),
    )
