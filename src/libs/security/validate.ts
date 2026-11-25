import Ajv, { JSONSchemaType, ValidateFunction } from "ajv";
import { NextFunction, Request, Response } from "express";
import { HttpCode } from "../Errors";
import { OrderStatus } from "../enums/order.enum";

// removeAdditional: 허용되지 않은 필드(memberType, memberPoints 등)는 자동으로 제거됨
// coerceTypes 미사용: {"$ne": null} 같은 객체가 문자열로 통과하지 못함
const ajv = new Ajv({ allErrors: true, removeAdditional: "all" });

const nick = { type: "string", minLength: 3, maxLength: 30 } as const;
const phone = { type: "string", minLength: 7, maxLength: 20 } as const;
const password = { type: "string", minLength: 4, maxLength: 72 } as const;
const text = { type: "string", maxLength: 500 } as const;

interface LoginBody {
  memberNick: string;
  memberPassword: string;
}
const loginSchema: JSONSchemaType<LoginBody> = {
  type: "object",
  properties: { memberNick: nick, memberPassword: password },
  required: ["memberNick", "memberPassword"],
  additionalProperties: false,
};

interface SignupBody {
  memberNick: string;
  memberPhone: string;
  memberPassword: string;
  memberAddress?: string;
  memberDesc?: string;
}
const signupSchema: JSONSchemaType<SignupBody> = {
  type: "object",
  properties: {
    memberNick: nick,
    memberPhone: phone,
    memberPassword: password,
    memberAddress: { ...text, nullable: true },
    memberDesc: { ...text, nullable: true },
  },
  required: ["memberNick", "memberPhone", "memberPassword"],
  additionalProperties: false,
};

interface MemberUpdateBody {
  memberNick?: string;
  memberPhone?: string;
  memberAddress?: string;
  memberDesc?: string;
}
const memberUpdateSchema: JSONSchemaType<MemberUpdateBody> = {
  type: "object",
  properties: {
    memberNick: { ...nick, nullable: true },
    memberPhone: { ...phone, nullable: true },
    memberAddress: { ...text, nullable: true },
    memberDesc: { ...text, nullable: true },
  },
  required: [],
  additionalProperties: false,
};

interface OrderItemBody {
  productId: string;
  itemQuantity: number;
}
const orderCreateSchema: JSONSchemaType<OrderItemBody[]> = {
  type: "array",
  minItems: 1,
  maxItems: 50,
  items: {
    type: "object",
    properties: {
      productId: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
      itemQuantity: { type: "integer", minimum: 1, maximum: 100 },
    },
    required: ["productId", "itemQuantity"],
    additionalProperties: false,
  },
};

interface OrderUpdateBody {
  orderId: string;
  orderStatus: string;
}
const orderUpdateSchema: JSONSchemaType<OrderUpdateBody> = {
  type: "object",
  properties: {
    orderId: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
    orderStatus: { type: "string", enum: Object.values(OrderStatus) },
  },
  required: ["orderId", "orderStatus"],
  additionalProperties: false,
};

const makeValidator =
  (validate: ValidateFunction) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (validate(req.body)) return next();
    res.status(HttpCode.BAD_REQUEST).json({
      code: HttpCode.BAD_REQUEST,
      message: "Invalid request body",
    });
  };

export const validateLogin = makeValidator(ajv.compile(loginSchema));
export const validateSignup = makeValidator(ajv.compile(signupSchema));
export const validateMemberUpdate = makeValidator(ajv.compile(memberUpdateSchema));
export const validateOrderCreate = makeValidator(ajv.compile(orderCreateSchema));
export const validateOrderUpdate = makeValidator(ajv.compile(orderUpdateSchema));
