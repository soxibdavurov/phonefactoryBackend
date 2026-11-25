/*
 * results-baseline.json + results-defended.json → 표 1,
 * perf-baseline.json + perf-defended.json → 표 2 (Markdown).
 */
const fs = require("fs");
const path = require("path");

const read = (f) => {
  const p = path.join(__dirname, f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};

const b = read("results-baseline.json");
const d = read("results-defended.json");
if (!b || !d) {
  console.error("먼저 baseline과 defended 모드에서 run.js를 실행하십시오.");
  process.exit(1);
}

const label = {
  privilege_escalation: "권한 상승 (대량 할당)",
  price_tampering: "가격 변조",
  nosql_injection: "NoSQL 연산자 주입",
  brute_force: "무차별 대입 (차단 없음)",
};
const mark = (v) => (v === null ? "N/A" : v ? "성공" : "차단");

console.log("### 표 1. 방어 적용 전후 공격 결과\n");
console.log("| 공격 유형 | Baseline | Defended |");
console.log("|---|---|---|");
for (const k of Object.keys(label)) {
  const bs = b.attacks[k] ? mark(b.attacks[k].success) : "-";
  const ds = d.attacks[k] ? mark(d.attacks[k].success) : "-";
  console.log(`| ${label[k]} | ${bs} | ${ds} |`);
}

const pb = read("perf-baseline.json");
const pd = read("perf-defended.json");
if (pb && pd) {
  console.log("\n### 표 2. 성능 오버헤드\n");
  console.log("| API | Baseline avg(ms) | Defended avg(ms) | 증가(ms) | Baseline p99 | Defended p99 | Baseline req/s | Defended req/s |");
  console.log("|---|---|---|---|---|---|---|---|");
  const warn = [];
  for (const bench of pb.benchmarks) {
    const dd = pd.benchmarks.find((x) => x.title === bench.title);
    if (!dd) continue;
    const inc = (dd.latency_avg_ms - bench.latency_avg_ms).toFixed(2);
    console.log(
      `| ${bench.title} | ${bench.latency_avg_ms} | ${dd.latency_avg_ms} | ${inc} | ${bench.latency_p99_ms} | ${dd.latency_p99_ms} | ${Math.round(bench.req_per_sec)} | ${Math.round(dd.req_per_sec)} |`
    );
    for (const [m, x] of [["baseline", bench], ["defended", dd]])
      if (x.non2xx || x.errors) warn.push(`${m}/${x.title}: non2xx=${x.non2xx}, errors=${x.errors}`);
  }
  const rep = pb.benchmarks[0] && pb.benchmarks[0].repeat;
  console.log(`\n(20 동시 연결, 15초${rep ? `, ${rep}회 반복 평균` : ""})`);
  console.log(warn.length ? `\n!! 표 2 신뢰 불가 — 오류 응답 존재: ${warn.join("; ")}` : "\n표 2: 모든 요청 정상 응답(2xx) 확인");
} else {
  console.log("\n(perf-*.json 없음 — perf.js를 실행하십시오)");
}
