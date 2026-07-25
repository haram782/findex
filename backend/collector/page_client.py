import os
import random
import time
from datetime import date
from typing import Callable

import requests
from tenacity import (
    Retrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from collector.parser import ParsedPriceRow, PriceTableParseError, parse_price_page


class PricePageClientError(RuntimeError):
    pass


class MobilePricePageClient:
    endpoint = "https://www.susansijang.co.kr/nsis/mim/info/mim9030"

    def __init__(
        self,
        session: requests.Session | None = None,
        delay_range: tuple[float, float] | None = None,
        timeout: tuple[float, float] | None = None,
        max_retries: int | None = None,
        sleeper: Callable[[float], None] = time.sleep,
    ):
        self.session = session or requests.Session()
        self.delay_range = delay_range or (
            float(os.getenv("COLLECTOR_MIN_DELAY_SECONDS", "1")),
            float(os.getenv("COLLECTOR_MAX_DELAY_SECONDS", "2")),
        )
        self.timeout = timeout or (
            5.0,
            float(os.getenv("COLLECTOR_TIMEOUT_SECONDS", "20")),
        )
        self.max_retries = max_retries or int(
            os.getenv("COLLECTOR_MAX_RETRIES", "3")
        )
        self.sleeper = sleeper
        self.has_requested = False
        self.session.headers.update(
            {
                "User-Agent": "Findex/1.0 (personal market data collector)",
                "Accept": "text/html,application/xhtml+xml",
            }
        )

    def _request_page_once(self, target_date: date, page: int) -> str:
        if self.has_requested:
            self.sleeper(random.uniform(*self.delay_range))
        self.has_requested = True
        response = self.session.post(
            self.endpoint,
            data={
                "searchYear": f"{target_date.year:04d}",
                "searchMonth": f"{target_date.month:02d}",
                "searchDate": f"{target_date.day:02d}",
                "pageIndex": str(page),
            },
            timeout=self.timeout,
        )
        response.raise_for_status()
        return response.text

    def _request_page(self, target_date: date, page: int) -> str:
        retrying = Retrying(
            retry=retry_if_exception_type(requests.RequestException),
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=1, max=8),
            sleep=self.sleeper,
            reraise=True,
        )
        return retrying(self._request_page_once, target_date, page)

    def fetch_date(self, target_date: date) -> tuple[ParsedPriceRow, ...]:
        rows: list[ParsedPriceRow] = []
        page_number = 1
        total_pages = 1
        try:
            while page_number <= total_pages:
                parsed = parse_price_page(
                    self._request_page(target_date, page_number)
                )
                rows.extend(parsed.rows)
                total_pages = max(total_pages, parsed.total_pages)
                page_number += 1
        except requests.RequestException as error:
            raise PricePageClientError(
                f"{target_date.isoformat()} 페이지 요청에 실패했습니다."
            ) from error
        except PriceTableParseError:
            raise
        return tuple(rows)
