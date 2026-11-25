# 보안 실험 (석사학위논문 제4장)

이 폴더의 스크립트는 논문 제4장의 <표 1>(공격 결과)과 <표 2>(성능 오버헤드)를 산출합니다.
동일한 코드를 **방어 미적용(baseline)** 모드와 **방어 적용(defended)** 모드로 실행하여 비교합니다.
모드는 환경 변수 `SECURITY`로 선택하며, 브랜치를 바꿀 필요가 없습니다.

| 모드 | 설정 | 의미 |
|---|---|---|
| baseline | `SECURITY=off` | 방어 기능 비활성화 (취약한 상태 재현) |
| defended | 설정하지 않음 (기본값) | 방어 기능 활성화 (운영 환경 기본값) |

토글 구현: [`src/libs/security/flag.ts`](../src/libs/security/flag.ts)

## 파일 구성

| 파일 | 역할 |
|---|---|
| `run.js` | 4가지 공격을 HTTP 요청으로 재현하고, 응답 코드와 DB 상태로 성공/차단을 자동 판정 → `results-<모드>.json` |
| `perf.js` | autocannon으로 로그인·상품 목록 API 성능 측정 (동시 연결 20, 15초) → `perf-<모드>.json` |
| `report.js` | 두 모드의 결과를 <표 1>, <표 2> 형식의 Markdown 표로 출력 |
| `run-sectest.bat` | (Windows) 위 과정을 한 번에 실행: 공격 테스트(baseline → defended) → 성능 측정(baseline → defended) → 결과표 순으로, 단계마다 서버를 해당 모드로 새로 시작하여 실행하고 `REPORT.txt` 생성 |
| `results/` | 논문에 사용한 실제 실행 결과 (아래 "실험 결과" 참고) |

## 준비

```bash
# backend 폴더에서
npm install
npm install --save-dev autocannon      # 성능 측정용

# .env (반드시 운영 DB와 분리된 테스트용 DB 사용):
#   MONGO_URL=mongodb://127.0.0.1:27017/phonefactory_sectest
#   SECRET_TOKEN=...   SESSION_SECRET=...   PORT=3999
```

## 실행 방법

### Windows (일괄 실행)

```bat
cd backend
security-test\run-sectest.bat
```

### 수동 실행 (모드별)

```bash
# ---------- BASELINE (방어 미적용) ----------
SECURITY=off PORT=3999 npm run start:dev      # 터미널 1
MODE=baseline node security-test/run.js        # 터미널 2
MODE=baseline node security-test/perf.js       # (선택) 성능 측정
# 서버 종료 (Ctrl+C)

# ---------- DEFENDED (방어 적용) ----------
PORT=3999 npm run start:dev                     # 터미널 1
MODE=defended node security-test/run.js         # 터미널 2
MODE=defended node security-test/perf.js        # (선택)
# 서버 종료

# ---------- 결과표 출력 ----------
node security-test/report.js
```

서버 시작 시 `[SECTEST] SECURITY_ON=true/false ... PERF_NO_RATELIMIT=true/false` 로그가 출력되어 실행 모드를 확인할 수 있습니다.

### 성능 측정 시 Rate Limiting 처리

defended 모드의 성능 측정에서는 `PERF_NO_RATELIMIT=1`로 **rate limiter만** 우회합니다.
단일 IP에서 20개 동시 연결을 보내면 로그인 제한(10분당 5회)이 즉시 작동하여 대부분의 요청이 HTTP 429가 되므로,
나머지 방어 기능(AJV 입력 검증, helmet, 쿠키 속성)의 비용을 측정할 수 없기 때문입니다.
Rate Limiting의 효과는 공격 테스트(무차별 대입)에서 별도로 확인합니다. (논문 4.4.3절)
구현: `src/libs/security/rateLimit.ts`

## 실험 공격과 판정 기준

| # | 공격 | 요청 | 성공 판정 | 방어 (defended) |
|---|---|---|---|---|
| 1 | 권한 상승 (대량 할당) | `POST /member/signup` 에 `memberType: "MOBILESHOP"`, `memberPoints: 99999` 추가 | 주입한 값이 DB에 저장됨 | AJV `removeAdditional`로 허용되지 않은 필드 제거, 서비스에서 역할·포인트 고정 |
| 2 | 가격 변조 | `POST /order/create` 에 `itemPrice: 1` (실제 가격 1000) | 주문 총액이 1000 미만 | 서버가 DB 가격으로 총액 재계산 |
| 3 | NoSQL 연산자 주입 | `POST /member/login` 에 `{"$ne": null}` 객체 | 요청이 검증에서 거부되지 않음 (HTTP 400 아님) | AJV 문자열 타입 강제 → HTTP 400 |
| 4 | 무차별 대입 | 같은 계정으로 잘못된 비밀번호 20회 로그인 | HTTP 429 차단이 한 번도 없음 | express-rate-limit (IP당 10분에 실패 5회) → HTTP 429 |
| - | XSS | (정보성) | React 기본 이스케이프로 수동 확인 | — |

## 방어 코드 위치

| 방어 | 파일 |
|---|---|
| AJV 입력 검증 (화이트리스트 + 타입 강제) | `src/libs/security/validate.ts`, `src/router.ts` |
| Rate Limiting | `src/libs/security/rateLimit.ts` |
| 서버 측 가격 재계산, 주문 상태 전이 제한 | `src/models/Order.service.ts` |
| 회원가입·수정 시 역할/포인트 고정 | `src/models/Member.service.ts` |
| HttpOnly·SameSite 쿠키 | `src/controllers/member.controller.ts` |
| 보안 로그 (로그인 성공/실패, JSON 라인) | `src/libs/security/securityLog.ts` |
| helmet 보안 헤더, CORS Origin 제한 | `src/app.ts` |

## 실험 결과 (논문에 사용한 실제 실행 결과)

`results/` 폴더는 2026-10-15(UTC)에 `run-sectest.bat`으로 실행한 결과 원본이며, 논문 <표 1>, <표 2>의 수치는 이 파일에서 가져왔습니다.

| 파일 | 내용 |
|---|---|
| `REPORT.txt` | `report.js`가 생성한 <표 1>, <표 2> 및 각 서버의 실행 모드 확인 로그 |
| `results-baseline.json`, `results-defended.json` | 공격별 성공 여부와 관측값 (DB 저장값, HTTP 상태 코드 등) |
| `perf-baseline.json`, `perf-defended.json` | 성능 측정 원시값 (3회 반복 각각의 값과 평균) |
| `attack-baseline.log`, `attack-defended.log` | 공격 테스트 중 서버 로그 (요청별 HTTP 상태 코드 확인 가능) |

요약:

| 공격 | Baseline (방어 미적용) | Defended (방어 적용) |
|---|---|---|
| 권한 상승 (대량 할당) | 성공: memberType=MOBILESHOP, memberPoints=99999 저장 | 차단: USER, 0 |
| 가격 변조 | 성공: 1,000원 상품이 총액 6으로 주문 (상품 1 + 배송비 5) | 차단: 총액 1,000으로 재계산 |
| NoSQL 연산자 주입 | 성공: 질의 계층까지 도달 (HTTP 500) | 차단: HTTP 400 |
| 무차별 대입 (20회) | 성공: 20회 모두 처리 | 차단: 4회 처리, 16회 HTTP 429 |

| API | Baseline 평균(ms) | Defended 평균(ms) | Baseline p99 | Defended p99 |
|---|---|---|---|---|
| 로그인 | 449.19 | 402.30 | 1454.33 | 1186 |
| 상품 목록 | 181.87 | 177.24 | 798.67 | 792.67 |

※ `REPORT.txt`의 일부 안내 문구는 실행 당시 스크립트가 우즈베크어였기 때문에 우즈베크어로 남아 있습니다 (원본 보존). 현재 스크립트의 출력은 한국어입니다.
※ 측정 시 원격 DB(MongoDB Atlas)를 사용하여 지연 시간 변동이 크며, 두 모드의 평균 차이는 측정 변동 폭 이내입니다.

## 주의 사항

- 외부 사이트에는 어떠한 요청도 보내지 않으며, 로컬 테스트 서버(127.0.0.1)에만 요청합니다.
- 테스트 데이터는 별도의 테스트 DB에 기록됩니다.
- 수치(특히 성능)는 실행 환경에 따라 달라질 수 있습니다.
