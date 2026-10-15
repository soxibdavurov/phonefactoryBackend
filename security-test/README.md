# Xavfsizlik testlari (논문 4장 실험)

Bu skriptlar maqolaning 4-bobi uchun raqamlarni chiqaradi. Bir xil kod
**himoyasiz (baseline)** va **himoyali (defended)** rejimda sinaladi.
Rejim `SECURITY` muhit o'zgaruvchisi bilan tanlanadi — branch almashtirish shart emas:

- `SECURITY=off` → baseline (himoya o'chirilgan, zaif holat)
- (o'rnatilmasa) → defended (himoya yoqilgan, odatiy)

## Tayyorgarlik

```bash
# backend papkada
npm install
npm install --save-dev autocannon      # unumdorlik o'lchovi uchun

# .env da quyidagilar bo'lsin (test uchun ALOHIDA baza ishlating):
#   MONGO_URL=mongodb://127.0.0.1:27017/phonefactory_sectest
#   SECRET_TOKEN=...   SESSION_SECRET=...   PORT=3999
```

## Ishga tushirish

Har rejim uchun: serverni o'sha rejimda ishga tushiring, test skriptini ishga tushiring, serverni to'xtating.

```bash
# ---------- BASELINE (himoyasiz) ----------
SECURITY=off PORT=3999 npm run start:dev      # 1-terminal
MODE=baseline node security-test/run.js        # 2-terminal
MODE=baseline node security-test/perf.js       # (ixtiyoriy) unumdorlik
# serverni to'xtating (Ctrl+C)

# ---------- DEFENDED (himoyali) ----------
PORT=3999 npm run start:dev                     # 1-terminal
MODE=defended node security-test/run.js         # 2-terminal
MODE=defended node security-test/perf.js        # (ixtiyoriy)
# serverni to'xtating

# ---------- Jadvalni chiqarish ----------
node security-test/report.js
```

`report.js` 표 1 (hujum natijalari) va 표 2 (unumdorlik) ni tayyor Markdown
jadval ko'rinishida beradi. O'sha raqamlarni to'g'ridan-to'g'ri maqolaga ko'chiramiz.

## Sinaladigan hujumlar

1. **권한 상승 (대량 할당)** — ro'yxatdan o'tishda `memberType`/`memberPoints` yuborish
2. **가격 변조** — buyurtmada `itemPrice` ni o'zgartirish
3. **NoSQL 연산자 주입** — login'ga `{"$ne": null}` obyekt yuborish
4. **무차별 대입** — login'ni 20 marta takrorlash (차단 여부)
5. **XSS** — React escape holati (qo'lda tekshiriladi, skript faqat eslatma beradi)

## Eslatma

- Hech qanday tashqi saytga hujum qilinmaydi — faqat lokal test serveriga (127.0.0.1:3999).
- Test ma'lumotlari alohida `_sectest` bazasiga yoziladi.
- Haqiqiy raqamlar sizning kompyuteringizda chiqadi.
