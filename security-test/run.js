/*
 * 논문 4장 실험 러너 (baseline vs defended)
 * Serverni oldindan ishga tushiring (PORT=3999), keyin bu skriptni ishga tushiring.
 * Bu skript faqat LOKAL test serveriga so'rov yuboradi, tashqi saytga emas.
 */
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const BASE = process.env.TEST_URL || "http://127.0.0.1:3999";
const MODE = process.env.MODE || "baseline";
const MONGO = process.env.MONGO_URL;
const OUT = path.join(__dirname, `results-${MODE}.json`);

function cookieHeader(res, jar) {
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of sc) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    jar[kv.slice(0, i)] = kv.slice(i + 1);
  }
}
const jarToHeader = (jar) =>
  Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

async function req(method, p, body, jar) {
  const headers = { "Content-Type": "application/json" };
  if (jar && Object.keys(jar).length) headers["Cookie"] = jarToHeader(jar);
  const res = await fetch(BASE + p, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (jar) cookieHeader(res, jar);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  return { status: res.status, data };
}

const rnd = () => Math.random().toString(36).slice(2, 8);

async function main() {
  if (!MONGO) throw new Error("MONGO_URL .env da bo'lishi kerak");
  const client = await MongoClient.connect(MONGO);
  const db = client.db();
  const results = { mode: MODE, generatedAt: new Date().toISOString(), attacks: {} };

  // --- Seed: bitta mahsulot (narx 1000) ---
  const products = db.collection("products");
  const prod = await products.insertOne({
    productStatus: "PROCESS",
    productCollection: "OTHER",
    productName: "SECTEST-" + rnd(),
    productPrice: 1000,
    productLeftCount: 100,
    productBrand: "OTHER",
    productImages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const productId = prod.insertedId.toString();

  // --- Oddiy foydalanuvchi (userA) ---
  const nickA = "userA_" + rnd();
  const jarA = {};
  await req("POST", "/member/signup", {
    memberNick: nickA,
    memberPhone: "010" + Math.floor(1e7 + Math.random() * 8e7),
    memberPassword: "pass1234",
  }, jarA);

  // =========================================================
  // 1) 권한 상승 (대량 할당) — 회원가입 시 memberType/memberPoints 주입
  // =========================================================
  const evilNick = "evil_" + rnd();
  await req("POST", "/member/signup", {
    memberNick: evilNick,
    memberPhone: "010" + Math.floor(1e7 + Math.random() * 8e7),
    memberPassword: "pass1234",
    memberType: "MOBILESHOP",
    memberPoints: 99999,
  });
  const injected = await db
    .collection("members")
    .findOne({ memberNick: evilNick });
  const privEsc =
    injected &&
    (injected.memberType === "MOBILESHOP" || injected.memberPoints >= 99999);
  results.attacks.privilege_escalation = {
    desc: "회원가입 시 memberType/memberPoints 주입",
    success: !!privEsc,
    observed: injected
      ? { memberType: injected.memberType, memberPoints: injected.memberPoints }
      : null,
  };

  // =========================================================
  // 2) 가격 변조 — 주문 생성 시 itemPrice 조작
  // =========================================================
  const order = await req("POST", "/order/create", [
    { productId, itemQuantity: 1, itemPrice: 1, itemDiscount: 0 },
  ], jarA);
  let orderTotal = null;
  if (order.status < 400) {
    const created = order.data && (order.data.result || order.data);
    orderTotal = created && created.orderTotal;
  }
  // Haqiqiy narx 1000; agar total 1000 dan kichik bo'lsa, narx qabul qilingan
  const priceTamper =
    order.status < 400 && orderTotal !== null && orderTotal < 1000;
  results.attacks.price_tampering = {
    desc: "주문 생성 시 itemPrice=1 조작 (실제 1000)",
    success: !!priceTamper,
    observed: { httpStatus: order.status, orderTotal },
  };

  // =========================================================
  // 3) NoSQL 연산자 주입 — 로그인 입력에 $ne 객체
  // =========================================================
  const nosql = await req("POST", "/member/login", {
    memberNick: { $ne: null },
    memberPassword: { $ne: null },
  });
  // 성공 = 서버가 객체를 쿼리 계층까지 받아들임 (검증에서 막히지 않음)
  // 방어 시 AJV가 400으로 차단
  const nosqlReached = nosql.status !== 400;
  results.attacks.nosql_injection = {
    desc: "로그인 입력에 {$ne:null} 객체 주입",
    success: nosqlReached,
    observed: { httpStatus: nosql.status },
  };

  // =========================================================
  // 4) 무차별 대입 — 로그인 20회 반복, 차단(429) 여부
  // =========================================================
  let processed = 0;
  let blocked = 0;
  for (let i = 0; i < 20; i++) {
    const r = await req("POST", "/member/login", {
      memberNick: nickA,
      memberPassword: "wrongpass" + i,
    });
    if (r.status === 429) blocked++;
    else processed++;
  }
  results.attacks.brute_force = {
    desc: "로그인 20회 반복 시도",
    success: blocked === 0, // 전부 처리되면 공격 성공(차단 없음)
    observed: { processed, blocked },
  };

  // =========================================================
  // 5) XSS — React 출력 이스케이프 확인 (정보성)
  // =========================================================
  results.attacks.xss_note = {
    desc: "React 기본 이스케이프로 사용자 입력 XSS 싱크 미발견 (수동 확인 필요)",
    success: null,
    observed: "dangerouslySetInnerHTML 1건(homePageSlider1, 정적 JSON)만 존재",
  };

  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`\n[${MODE}] natija yozildi: ${OUT}`);
  for (const [k, v] of Object.entries(results.attacks)) {
    const s = v.success === null ? "N/A" : v.success ? "공격 성공" : "차단됨";
    console.log(`  ${k.padEnd(22)} ${s}  ${JSON.stringify(v.observed)}`);
  }
  await client.close();
}

main().catch((e) => {
  console.error("TEST ERROR:", e.message);
  process.exit(1);
});
