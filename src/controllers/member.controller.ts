import { json, NextFunction, Request, Response } from "express";
import { T } from "../libs/types/common";
import MemberService from "../models/Member.service";
import {
  ExtendedRequest,
  LoginInput,
  Member,
  MemberInput,
  MemberUpdateInput,
} from "../libs/types/member";
import Errors, { HttpCode, Message } from "../libs/Errors";
import AuthService from "../models/Auth.service";
import { AUTH_TIMER } from "../libs/config";
import { logSecurityEvent } from "../libs/security/securityLog";
import { SECURITY_ON } from "../libs/security/flag";

// Token JavaScript orqali o'qilmasligi uchun HttpOnly; CSRF xavfini kamaytirish uchun SameSite
const tokenCookieOptions = {
  maxAge: AUTH_TIMER * 3600 * 1000,
  httpOnly: SECURITY_ON, // baseline rejimda httpOnly: false (zaif)
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
// Frontend faqat "login qilinganmi" ekanini bilishi uchun maxfiy bo'lmagan belgi
const flagCookieOptions = { ...tokenCookieOptions, httpOnly: false };

//REACT

const memberService = new MemberService();
const authService = new AuthService();
const memberController: T = {};

memberController.getMobileshop = async (req: Request, res: Response) => {
  try {
    console.log("getMobileshop");

    const result = await memberService.getMobileshop();

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, signup", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
    //res.json({ });
  }
};

// TODO TOKENS AUTHENTICATION
memberController.signup = async (req: Request, res: Response) => {
  try {
    console.log("signup");
    const input: MemberInput = req.body,
      result: Member = await memberService.signup(input);
    const token = await authService.createToken(result);
    res.cookie("accessToken", token, tokenCookieOptions);
    res.cookie("isLoggedIn", "1", flagCookieOptions);

    res.status(HttpCode.CREATED).json({ member: result });
  } catch (err) {
    console.log("Error, signup", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
    //res.json({ });
  }
};

// TODO TOKENS AUTHENTICATION
memberController.login = async (req: Request, res: Response) => {
  try {
    console.log("login");
    const input: LoginInput = req.body,
      result = await memberService.login(input),
      token = await authService.createToken(result);

    res.cookie("accessToken", token, tokenCookieOptions);
    res.cookie("isLoggedIn", "1", flagCookieOptions);

    logSecurityEvent("LOGIN_SUCCESS", { memberNick: input.memberNick, ip: req.ip });
    res.status(HttpCode.OK).json({ member: result });
  } catch (err) {
    console.log("Error, login", err);
    logSecurityEvent("LOGIN_FAIL", { ip: req.ip });
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.logout = (req: ExtendedRequest, res: Response) => {
  try {
    console.log("logout");
    res.clearCookie("accessToken", tokenCookieOptions);
    res.clearCookie("isLoggedIn", flagCookieOptions);
    res.status(HttpCode.OK).json({ logout: true });
  } catch (err) {
    console.log("Error, logout", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.getMemberDetail = async (
  req: ExtendedRequest,
  res: Response
) => {
  try {
    console.log("getMemberDetail");
    const result = await memberService.getMemberDetail(req.member);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getMemberDetail", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.updateMember = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("updateMember");
    const input: MemberUpdateInput = req.body;
    if (req.file) input.memberImage = req.file.path.replace(/\\/g, "/");
    const result = await memberService.updateMember(req.member, input);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, updateMember", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.getTopUsers = async (req: Request, res: Response) => {
  try {
    console.log("getTopUsers");
    const result = await memberService.getTopUsers();

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getTopUsers", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.verifyAuth = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies["accessToken"];
    if (token) req.member = await authService.checkAuth(token);

    if (!req.member)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    next();
  } catch (err) {
    console.log("Error, verifyAuth", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

memberController.retrieveAuth = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies["accessToken"];
    if (token) req.member = await authService.checkAuth(token);
    next();
  } catch (err) {
    console.log("Error, retrieveAuth:", err);
    next();
  }
};

export default memberController;
