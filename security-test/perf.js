/*
 * 성능 오버헤드 측정 (표 2).
 * 서버를 먼저 실행해 두십시오. autocannon 설치: npm i -D autocannon
 * MODE=baseline node security-test/perf.js   또는   MODE=defended ...
 */
const autocannon = require("autocannon");
const fs = require("fs");
const path = require("path");

const BASE = process.env.TEST_URL || "http://127.0.0.1:3999";
const MODE = process.env.MODE || "baseline";
const OUT = path.join(__dirname, `perf-${MODE}.json`);

// 성능 측정용 실제(올바른 비밀번호) 계정: 로그인이 성공하므로
// rate-limiter(skipSuccessfulRequests)가 차단하지 않으며,
// 두 모드 모두에서 로그인 경로의 순수 오버헤드를 측정한다.
const PERF_USER = {
  memberNick: "perfuser",
  memberPhone: "01099990000",
  memberPassword: "perfpass1234",
};

async function ensurePerfUser() {
  try {
    await fetch(BASE + "/member/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(PERF_USER),
    });
  } catch (_) {
    // 이미 존재하는 경우 등 — 로그인은 그대로 동작한다
  }
}

// 중요: autocannon은 전체 URL로 호출한다 (별도의 `path` 옵션은
// autocannon이 무시하여 요청이 `/`로 가서 404가 된다).
function bench(title, pathStr, opts) {
  return new Promise((resolve, reject) => {
    autocannon(
      { url: BASE + pathStr, connections: 20, duration: 15, ...opts },
      (err, res) => {
        if (err) return reject(err);
        resolve({
          title,
          latency_avg_ms: res.latency.average,
          latency_p99_ms: res.latency.p99,
          req_per_sec: res.requests.average,
          non2xx: res.non2xx,          // 404/4xx/5xx 개수 — 0이어야 함 (login/signup의 429는 예외)
          errors: res.errors,          // 연결 오류
          status_2xx: res["2xx"],
        });
      }
    );
  });
}

async function main() {
  const out = { mode: MODE, generatedAt: new Date().toISOString(), benchmarks: [] };

  // 올바른 비밀번호 계정 준비 (로그인 성공 = rate-limit 미차단)
  await ensurePerfUser();

  // 로그인 API (유효 계정 — bcrypt 비교 포함, 두 모드 동일 경로)
  out.benchmarks.push(
    await bench("login", "/member/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberNick: PERF_USER.memberNick,
        memberPassword: PERF_USER.memberPassword,
      }),
    })
  );

  // 상품 목록 조회 (읽기 경로)
  out.benchmarks.push(
    await bench("product_list", "/product/all?page=1&limit=10&order=createdAt", {
      method: "GET",
    })
  );

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\n[${MODE}] 성능 결과: ${OUT}`);
  for (const b of out.benchmarks) {
    console.log(
      `  ${b.title.padEnd(14)} avg=${b.latency_avg_ms}ms p99=${b.latency_p99_ms}ms rps=${Math.round(b.req_per_sec)} 2xx=${b.status_2xx} non2xx=${b.non2xx} errors=${b.errors}`
    );
  }
}

main().catch((e) => {
  console.error("PERF ERROR:", e.message);
  process.exit(1);
});
