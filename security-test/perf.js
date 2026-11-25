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

function bench(title, opts) {
  return new Promise((resolve, reject) => {
    autocannon(
      // 주의: autocannon은 최상위 "path" 옵션을 무시하므로 전체 URL을 전달한다
      { connections: 20, duration: 15, ...opts },
      (err, res) => {
        if (err) return reject(err);
        resolve({
          title,
          latency_avg_ms: res.latency.average,
          latency_p99_ms: res.latency.p99,
          req_per_sec: res.requests.average,
          non2xx: res.non2xx,
          errors: res.errors,
        });
      }
    );
  });
}

// 원격 DB(Atlas)로 인해 측정값 변동이 크므로 각 테스트를 REPEAT회 반복하여 평균을 사용한다
const REPEAT = Number(process.env.REPEAT || 3);
const round2 = (x) => Math.round(x * 100) / 100;

async function benchRepeated(title, opts) {
  const runs = [];
  for (let i = 0; i < REPEAT; i++) runs.push(await bench(title, opts));
  const mean = (k) => round2(runs.reduce((s, r) => s + r[k], 0) / runs.length);
  return {
    title,
    repeat: REPEAT,
    latency_avg_ms: mean("latency_avg_ms"),
    latency_p99_ms: mean("latency_p99_ms"),
    req_per_sec: mean("req_per_sec"),
    non2xx: runs.reduce((s, r) => s + r.non2xx, 0),
    errors: runs.reduce((s, r) => s + r.errors, 0),
    runs,
  };
}

async function main() {
  const out = { mode: MODE, generatedAt: new Date().toISOString(), benchmarks: [] };

  // 올바른 비밀번호 계정 준비 (로그인이 성공해야 함)
  await ensurePerfUser();

  // 로그인 API (유효 계정 — bcrypt 비교 포함, 두 모드 동일 경로)
  out.benchmarks.push(
    await benchRepeated("login", {
      url: BASE + "/member/login",
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
    await benchRepeated("product_list", {
      url: BASE + "/product/all?page=1&limit=10&order=createdAt",
      method: "GET",
    })
  );

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\n[${MODE}] 성능 결과: ${OUT}`);
  for (const b of out.benchmarks) {
    console.log(
      `  ${b.title.padEnd(14)} avg=${b.latency_avg_ms}ms p99=${b.latency_p99_ms}ms rps=${Math.round(b.req_per_sec)} non2xx=${b.non2xx} errors=${b.errors}`
    );
    if (b.non2xx || b.errors) console.log(`  !! ${b.title}: 오류 응답 존재 — 이 측정값은 신뢰할 수 없음`);
  }
}

main().catch((e) => {
  console.error("PERF ERROR:", e.message);
  process.exit(1);
});
