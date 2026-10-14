/*
 * 성능 오버헤드 측정 (표 2).
 * Server ishga tushgan bo'lsin. autocannon o'rnating: npm i -D autocannon
 * MODE=baseline node security-test/perf.js   yoki   MODE=defended ...
 */
const autocannon = require("autocannon");
const fs = require("fs");
const path = require("path");

const BASE = process.env.TEST_URL || "http://127.0.0.1:3999";
const MODE = process.env.MODE || "baseline";
const OUT = path.join(__dirname, `perf-${MODE}.json`);

// Perf uchun HAQIQIY (to'g'ri parolli) hisob: login muvaffaqiyatli bo'ladi,
// shuning uchun rate-limiter (skipSuccessfulRequests) uni bloklamaydi va biz
// ikkala rejimda ham login yo'lining sof overhead'ini o'lchaymiz.
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
    // allaqachon mavjud bo'lsa yoki boshqa holatda — login baribir ishlaydi
  }
}

function bench(title, opts) {
  return new Promise((resolve, reject) => {
    autocannon(
      { url: BASE, connections: 20, duration: 15, ...opts },
      (err, res) => {
        if (err) return reject(err);
        resolve({
          title,
          latency_avg_ms: res.latency.average,
          latency_p99_ms: res.latency.p99,
          req_per_sec: res.requests.average,
        });
      }
    );
  });
}

async function main() {
  const out = { mode: MODE, generatedAt: new Date().toISOString(), benchmarks: [] };

  // To'g'ri parolli hisob tayyorlanadi (login muvaffaqiyatli = rate-limit bloklamaydi)
  await ensurePerfUser();

  // 로그인 API (유효 계정 — bcrypt 비교 포함, 두 모드 동일 경로)
  out.benchmarks.push(
    await bench("login", {
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
    await bench("product_list", {
      method: "GET",
      path: "/product/all?page=1&limit=10&order=createdAt",
    })
  );

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\n[${MODE}] perf natija: ${OUT}`);
  for (const b of out.benchmarks) {
    console.log(
      `  ${b.title.padEnd(14)} avg=${b.latency_avg_ms}ms p99=${b.latency_p99_ms}ms rps=${Math.round(b.req_per_sec)}`
    );
  }
}

main().catch((e) => {
  console.error("PERF ERROR:", e.message);
  process.exit(1);
});
