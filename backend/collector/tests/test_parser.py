from decimal import Decimal
from pathlib import Path

import pytest

from collector.parser import PriceTableParseError, parse_price_page

FIXTURE_DIR = Path(__file__).parent / "fixtures"


def test_mobile_table_is_parsed_without_django_dependency():
    html = (FIXTURE_DIR / "mobile_prices.html").read_text()

    page = parse_price_page(html)

    assert page.total_pages == 2
    assert len(page.rows) == 2
    assert page.rows[0].species == "전복"
    assert page.rows[0].status == "활"
    assert page.rows[0].quantity == Decimal("1200")
    assert page.rows[1].species == "고등어"
    assert page.rows[1].status == "선"
    assert page.rows[1].price_avg == Decimal("15000")


def test_normal_table_with_no_rows_is_a_valid_empty_page():
    html = (FIXTURE_DIR / "mobile_empty.html").read_text()

    page = parse_price_page(html)

    assert page.rows == ()
    assert page.total_pages == 1


def test_fraction_pagination_text_exposes_total_page_count():
    html = (FIXTURE_DIR / "mobile_empty.html").read_text().replace(
        "</body>",
        '<div class="pagination">1 / 12</div></body>',
    )

    page = parse_price_page(html)

    assert page.total_pages == 12


def test_missing_expected_table_raises_parse_error():
    with pytest.raises(PriceTableParseError):
        parse_price_page("<html><table><tr><th>다른 열</th></tr></table></html>")


@pytest.mark.parametrize("value", ["-", "", "원"])
def test_invalid_required_number_raises_parse_error(value):
    html = (FIXTURE_DIR / "mobile_prices.html").read_text().replace("1,200", value, 1)

    with pytest.raises(PriceTableParseError):
        parse_price_page(html)
