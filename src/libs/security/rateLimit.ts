import rateLimit from "express-rate-limit";
import { HttpCode } from "../Errors";

// 10 daqiqada IP bo'yicha 5 ta muvaffaqiyatsiz login urinishi
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { code: 429, message: "Too many login attempts, try again later." },
});

// Ro'yxatdan o'tish: soatiga IP bo'yicha 10 ta
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { code: HttpCode.BAD_REQUEST, message: "Too many signups from this IP." },
});
