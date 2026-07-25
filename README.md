# Findex

노량진수산시장 경락시세를 수집해 어종별 가격과 거래량 추이를 보여주는 로컬
대시보드입니다. 상세 설계는 [DESIGN.md](DESIGN.md)를 참고하세요.
제품 Phase와 후속 작업은 [docs/ROADMAP.md](docs/ROADMAP.md)에서 추적합니다.

## 실행

```bash
cp .env.example .env
docker compose up --build
```

- 대시보드: <http://localhost:5173>
- API: <http://localhost:8000/api/v1/>

기본 cron 컨테이너는 데이터 확정 시각을 찾기 위해 세 시간마다 오늘 데이터를
읽기 전용으로 관찰합니다. 데일리 실행 시각은 관찰 후 확정합니다.

## 데이터 수집

```bash
docker compose run --rm backend python manage.py collect_prices 2026-07-25
docker compose run --rm backend python manage.py run_daily_batch
docker compose run --rm backend python manage.py observe_market
```

`run_daily_batch`는 어제 데이터와 아직 수집하지 않은 최근 과거 데이터를 함께
채웁니다. 수집기는 날짜별 모든 페이지를 먼저 파싱한 뒤 하나의 트랜잭션에서 기존
데이터를 교체합니다.

## 테스트

```bash
docker compose run --rm backend pytest
docker compose run --rm frontend npm test -- --run
```
