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
  console.error("Avval baseline va defended uchun run.js ni ishga tushiring.");
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
  console.log("| API | Baseline avg(ms) | Defended avg(ms) | 증가(ms) | Baseline p99 | Defended p99 |");
  console.log("|---|---|---|---|---|---|");
  for (const bench of pb.benchmarks) {
    const dd = pd.benchmarks.find((x) => x.title === bench.title);
    if (!dd) continue;
    const inc = (dd.latency_avg_ms - bench.latency_avg_ms).toFixed(2);
    console.log(
      `| ${bench.title} | ${bench.latency_avg_ms} | ${dd.latency_avg_ms} | ${inc} | ${bench.latency_p99_ms} | ${dd.latency_p99_ms} |`
    );
  }
} else {
  console.log("\n(perf-*.json topilmadi — perf.js ni ishga tushiring)");
}
