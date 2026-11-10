# PhoneFactory backend

Telefon do'koni backend'i: Express + TypeScript + MongoDB (Mongoose) + EJS admin panel.
Frontend alohida repo: `soxibdavurov/phonefactory-react`.

Muallif Soxibjon, junior full-stack dasturchi. **Javoblarni o'zbek tilida (lotin)** bering,
qisqa va qadamma-qadam, buyruqlarni u o'zi ishga tushiradigan qilib.

## Tuzilma
- `src/server.ts`: Mongo'ga ulanadi, `PORT` (default 3004) da tinglaydi
- `src/app.ts`: middleware, session (connect-mongodb-session), `/uploads` static (30 kun kesh)
- `src/router.ts`: REST API (React frontend uchun), `src/router-admin.ts`: `/admin/*` EJS sahifalar
- `src/controllers`, `src/models` (service'lar), `src/schema` (Mongoose modellar)
- `src/views` (EJS), `src/public` (admin CSS/JS)
- `src/libs/utils/uploader.ts`: multer, fayl nomi `uuid` bilan, `uploads/members`, `uploads/products`

## Ishga tushirish (lokal)
- Node 20 (nvm-windows), `npm i`, `npm run start:dev` (nodemon + ts-node)
- `npm run build` = `tsc && node extra.js` (views va public ni `dist/` ga ko'chiradi)
- `.env`: `MONGO_URL`, `SESSION_SECRET`, `SECRET_TOKEN`, `PORT`. `.env` hech qachon commit qilinmaydi.
- Baza MongoDB Atlas. Uy Wi-Fi'da `mongodb+srv://` DNS xatosi (`querySrv ECONNREFUSED`) beradi,
  shunda Atlas'dagi non-SRV `mongodb://host1,host2,host3/...` ulanish satri ishlatiladi.

## Deploy (Hostinger VPS, Docker)
- VPS: Ubuntu + Docker (Hostinger "Docker" shabloni), IP `72.61.127.164`, papka `~/phonefactory`
- `~/phonefactory` ichida: `phonefactorybackend/`, `phonefactory-react/` (git clone),
  `docker-compose.yml`, `Caddyfile`, `.env` (bular `deploy/` dan nusxa, git'da kuzatilmaydi)
- Servislar: `backend` (3004), `frontend` (nginx, 80), `caddy` (80/443, avtomatik HTTPS, `--profile caddy`)
- Domenlar: https://pf.dunyo.express (frontend), https://api.pf.dunyo.express (API + `/admin`)
- Rasmlar `uploads` nomli Docker volume'da turadi (konteyner qayta qurilsa ham saqlanadi)

Yangilash:
```
cd ~/phonefactory
git -C phonefactorybackend pull
git -C phonefactory-react pull
docker compose --profile caddy up -d --build          # hammasi
docker compose --profile caddy up -d --build backend  # faqat backend
docker compose logs -f backend
```
`deploy/` dagi `docker-compose.yml` yoki `Caddyfile` o'zgarsa, VPS'dagi nusxani qo'lda yangilash kerak.

## Qoidalar
- O'zgarishlar lokalda qilinadi, GitHub'ga push, keyin VPS'da `git pull`. VPS'da kodni tahrirlamang.
- Sirlarni (`.env` qiymatlari) chatga, kodga yoki commit'ga yozmang.
- Rejalashtirilgan: worldofcars loyihasini ham shu VPS'ga Docker bilan ko'chirish (Caddy umumiy proxy bo'ladi).
