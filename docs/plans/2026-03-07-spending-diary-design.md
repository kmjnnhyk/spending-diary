# Spending Diary - Design Document

## Overview

월별 가계부 웹 애플리케이션. 토스, 국민은행, 카카오페이, 당근페이, 네이버페이 내역을 이미지로 업로드하면 Claude API로 파싱하여 자동 분류하고, 페이 내역 간 연동을 통해 실제 지출처를 추적한다.

## Tech Stack

- **Frontend**: Next.js (App Router, Server Actions)
- **ORM**: Prisma
- **Database**: PostgreSQL (Docker)
- **AI**: Claude API (이미지 파싱 + 카테고리 분류)
- **Container**: Docker Compose (Next.js + PostgreSQL)

## Architecture

```
[Browser] → [Next.js App]
                ├── Server Actions (DB CRUD, Claude API 호출)
                ├── Prisma ORM → PostgreSQL (Docker)
                └── Claude API (이미지 파싱, 카테고리 분류)
```

별도 백엔드 API 서버 없이, Next.js Server Actions + Prisma로 PostgreSQL 직접 접근.

## Data Sources

| Source | Type | Format |
|--------|------|--------|
| 토스 은행 | 은행 | 이미지 → 엑셀 (추후) |
| 국민은행 | 은행 | 이미지 → 엑셀 (추후) |
| 카카오페이 | 간편결제 | 이미지 → 엑셀 (추후) |
| 당근페이 | 간편결제 | 이미지 → 엑셀 (추후) |
| 네이버페이 | 간편결제 | 이미지 → 엑셀 (추후) |

## DB Schema

### Month
- id (PK)
- year (int)
- month (int)
- created_at

### Transaction
- id (PK)
- month_id (FK → Month)
- date (datetime)
- description (text) - 파싱된 설명
- original_description (text) - 원본 텍스트
- amount (int)
- type (enum: INCOME/EXPENSE)
- source (enum: TOSS/KB/KAKAOPAY/DANGGEUN/NAVERPAY)
- category_id (FK → Category, nullable)
- category_status (enum: AUTO/MANUAL/PENDING)
- linked_pay_transaction_id (FK → Transaction, nullable, self-ref)
- is_pay_parent (boolean) - 은행에서 감지된 페이 결제 원본 여부
- created_at

### UploadedImage
- id (PK)
- month_id (FK → Month)
- source (enum)
- file_path (text)
- parsed (boolean)
- parsed_at (datetime, nullable)
- created_at

### Category
- id (PK)
- name (text)
- icon (text, nullable)
- color (text, nullable)
- created_at

## Pay Matching Logic

1. 토스/국민은행 내역 파싱 시, description에서 "카카오페이", "NV페이", "네이버페이", "당근페이" 등 키워드 탐지
2. 키워드 감지 시 해당 거래를 `is_pay_parent = true`로 마킹
3. 매칭 대상 페이 내역에서 같은 날짜 + 유사 금액의 거래 검색
4. 매칭 성공 시 `linked_pay_transaction_id`로 연결
5. 은행 원본 내역은 보존, 카테고리는 페이 상세 내역 기준으로 분류
6. 매칭 실패 시 사용자에게 수동 매칭 요청

## Category Auto-Classification

Claude API를 활용한 자동 분류:
- 거래 description 기반으로 카테고리 추론
- 확신도가 높은 항목: AUTO로 마킹
- 확신도가 낮거나 판단 불가: PENDING으로 마킹 → 사용자 수동 분류 UI 표시

### Default Categories
식비, 카페/간식, 교통, 쇼핑, 생활/마트, 통신, 구독/멤버십, 의료, 교육, 여가/문화, 경조사, 이체/송금, 기타

## Pages

1. **대시보드** (`/`): 월별 수입/지출 요약, 카테고리별 파이차트, 전월 대비
2. **이미지 업로드** (`/upload`): 소스별 이미지 업로드 → Claude API 파싱 → 결과 미리보기 → 확인 후 저장
3. **거래 내역** (`/transactions`): 전체 내역, 필터(소스/카테고리/날짜), 검색, 페이 연결 표시
4. **카테고리 분류** (`/classify`): PENDING 상태 항목 목록, 카테고리 선택 UI
5. **월별 리포트** (`/report`): 월간 지출 분석, 카테고리별 추이

## Monthly Cycle

- 가계부 단위: 월별
- 월 선택 UI로 해당 월 데이터 조회
- 이미지 업로드 시 해당 월에 자동 연결
