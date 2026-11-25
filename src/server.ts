import dotenv from 'dotenv';
dotenv.config({
    path: process.env.NODE_ENV === "production" ? ".env.production" : ".env",
});
import mongoose from 'mongoose';
import app from "./app";
import { SECURITY_ON } from "./libs/security/flag";


mongoose.connect(process.env.MONGO_URL as string, {})
    .then((data) => {
        console.log("MongoDB connection succeed");
        const PORT = process.env.PORT ?? 3004;
        app.listen(PORT, function () {
            console.log(`The server is running successfully on port: ${PORT}`);
            // 실험 모드를 명확히 출력 (baseline / defended 확인용)
            console.log(`[SECTEST] SECURITY_ON=${SECURITY_ON} (SECURITY=${process.env.SECURITY ?? "<unset>"}) PERF_NO_RATELIMIT=${process.env.PERF_NO_RATELIMIT === "1"}`);
            console.info(`Admin project on http://localhost:${PORT}/admin/home \n`);
        })
    })
    .catch((err) => console.log("ERROR on connection MongoDB", err));