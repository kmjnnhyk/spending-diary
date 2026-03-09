# 💰 Spending Diary (가계부)

은행/페이 거래내역 스크린샷을 AI로 파싱하고 자동 분류하는 월별 가계부 웹앱

<br>

## ✨ 주요 기능

### 📸 스크린샷 업로드 & AI 파싱
- **5개 소스 지원**: 토스, 국민은행, 카카오페이, 네이버페이, 당근페이
- 소스별 최적화된 Claude API 프롬프트로 거래내역 자동 추출
- 멀티 이미지 업로드 지원

### 🔄 크로스 레퍼런스 분석
- **내부 이체 감지**: KB↔토스 간 이체 자동 필터링
- **페이 충전 매칭**: 은행 출금 → 페이 결제 내역 자동 연결
- **환불 매칭**: 환불 거래와 원거래 자동 매칭 (당월 → 전월 탐색)
- **중복 제거**: 은행/페이 간 중복 거래 자동 제거

### 🏷️ AI 자동 분류
- Claude API 기반 17개 카테고리 자동 분류
- 확신도 높은 거래는 자동 확정, 낮은 거래는 수동 분류 대기
- 미확인(UNVERIFIED) 거래 별도 관리

### 📊 대시보드 & 리포트
- 월별 수입/지출 요약
- 카테고리별 지출 비율 차트
- 전월 대비 리포트
- 거래내역 검색 & 소스별 필터링

<br>

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| **Framework** | Next.js 16 (App Router, Server Actions) |
| **Language** | TypeScript, React 19 |
| **Database** | PostgreSQL 16 + Prisma v7 (PrismaPg adapter) |
| **AI** | Claude API (claude-sonnet-4-6) |
| **UI** | shadcn/ui v4 (base-ui) + Tailwind CSS v4 |
| **Infra** | Docker Compose |

<br>

## 📁 프로젝트 구조

```
src/
├── app/                       # Next.js App Router 페이지
│   ├── page.tsx               #   대시보드 (수입/지출 요약, 카테고리 차트)
│   ├── upload/page.tsx        #   이미지 업로드 & 분석
│   ├── classify/page.tsx      #   수동 카테고리 분류
│   ├── transactions/page.tsx  #   거래내역 목록
│   └── report/page.tsx        #   월별 리포트
├── actions/                   # Server Actions
│   ├── analyze.ts             #   메인 분석 파이프라인 (7단계)
│   ├── upload.ts              #   이미지 업로드 처리
│   ├── categorize.ts          #   수동 분류
│   ├── dashboard.ts           #   대시보드 데이터
│   ├── transactions.ts        #   거래내역 조회
│   └── report.ts              #   리포트 데이터
├── lib/
│   ├── claude.ts              #   Claude API - 소스별 파싱 프롬프트
│   ├── categorize.ts          #   AI 카테고리 분류 로직
│   ├── pay-matcher.ts         #   내부이체/환불/페이충전 감지
│   └── prisma.ts              #   Prisma 클라이언트
├── components/                # React 컴포넌트
│   ├── UploadFlow.tsx         #   업로드 → 분석 통합 플로우
│   ├── ClassifyCard.tsx       #   수동 분류 카드
│   ├── CategoryChart.tsx      #   카테고리 차트
│   ├── TransactionFilters.tsx #   필터 & 검색
│   └── ui/                    #   shadcn/ui 컴포넌트
└── generated/prisma/          # Prisma 생성 코드 (gitignore)

prisma/
├── schema.prisma              # DB 스키마
├── seed.mts                   # 카테고리 시드 데이터
└── migrations/                # DB 마이그레이션
```

<br>

## 🚀 시작하기

### 사전 요구사항

- Node.js 20+
- Docker & Docker Compose
- [Anthropic API Key](https://console.anthropic.com/)

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/kmjnnhyk/spending-diary.git
cd spending-diary

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cat > .env << 'EOF'
DATABASE_URL="postgresql://spending:spending_dev@localhost:5432/spending_diary"
ANTHROPIC_API_KEY="your-api-key-here"
EOF

# 4. DB 실행 & 초기 설정 (PostgreSQL + 마이그레이션 + 시드)
bash scripts/setup.sh

# 5. 개발 서버 실행
npm run dev
```

http://localhost:3000 에서 접속

### Docker로 전체 실행

```bash
# ANTHROPIC_API_KEY를 .env에 설정한 후
docker compose up --build
```

<br>

## 📋 분석 파이프라인

거래내역 이미지가 업로드되면 다음 7단계를 거칩니다:

```
1. 이미지 파싱     → Claude API로 소스별 맞춤 프롬프트 적용
2. 내부 이체 필터  → KB↔토스 이체 등 자동 제외
3. 페이 충전 매칭  → 은행 출금 ↔ 페이 결제 연결
4. 중복 제거       → 페이 내역 우선 (상세 설명 보존)
5. 월 자동 배정    → 거래 날짜 기준으로 월 결정
6. 환불 매칭       → 환불 ↔ 원거래 자동 연결
7. AI 자동 분류    → 카테고리 자동 배정
```

<br>

## 🏷️ 카테고리

| 카테고리 | 아이콘 | 카테고리 | 아이콘 |
|---------|--------|---------|--------|
| 식비 | 🍚 | 구독/멤버십 | 📺 |
| 카페/간식 | ☕ | 의료 | 🏥 |
| 교통 | 🚌 | 교육 | 📚 |
| 쇼핑 | 🛍️ | 여가/문화 | 🎬 |
| 생활/마트 | 🏠 | 경조사 | 💐 |
| 통신 | 📱 | 쿠팡 | 📦 |
| 편의점 | 🏪 | 공과금 | 🔌 |
| 중고판매 | 🥕 | 기타 | 📌 |

<br>

## 📄 License

MIT
