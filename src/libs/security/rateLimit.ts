import rateLimit from "express-rate-limit";
import { RequestHandler } from "express";
import { HttpCode } from "../Errors";

// 성능 측정 전용: PERF_NO_RATELIMIT=1 이면 rate limiter를 우회한다.
// 단일 IP에서 20개 동시 연결을 보내면 limiter가 즉시 작동해 모든 요청이 429가 되므로,
// 나머지 방어(AJV, helmet)의 오버헤드를 측정할 수 없기 때문이다.
const passthrough: RequestHandler = (_req, _res, next) => next();
const perfBypass = process.env.PERF_NO_RATELIMIT === "1";

// IP당 10분에 실패한 로그인 시도 5회
export const loginLimiter: RequestHandler = perfBypass
  ? passthrough
  : rateLimit({
      windowMs: 10 * 60 * 1000,
      limit: 5,
      skipSuccessfulRequests: true,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { code: 429, message: "Too many login attempts, try again later." },
    });

// 회원가입: IP당 1시간에 10회
export const signupLimiter: RequestHandler = perfBypass
  ? passthrough
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 10,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { code: HttpCode.BAD_REQUEST, message: "Too many signups from this IP." },
    });
