import rateLimit from "express-rate-limit";
import { HttpCode } from "../Errors";

// IP당 10분에 실패한 로그인 시도 5회
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { code: 429, message: "Too many login attempts, try again later." },
});

// 회원가입: IP당 1시간에 10회
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { code: HttpCode.BAD_REQUEST, message: "Too many signups from this IP." },
});
