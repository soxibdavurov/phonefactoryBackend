import express from "express";
const router = express.Router();
import memberController from "./controllers/member.controller";
import uploader from "./libs/utils/uploader";
import productController from "./controllers/product.controller";
import orderController from "./controllers/order.controller";
import {
  validateLogin,
  validateMemberUpdate,
  validateOrderCreate,
  validateOrderUpdate,
  validateSignup,
} from "./libs/security/validate";
import { loginLimiter, signupLimiter } from "./libs/security/rateLimit";
import { SECURITY_ON } from "./libs/security/flag";

// SECURITY=off bo'lsa middleware o'tkazib yuboriladi (baseline tajriba rejimi)
import { RequestHandler } from "express";
const guard = (mw: RequestHandler): RequestHandler =>
  SECURITY_ON ? mw : (_req, _res, next) => next();

/** Member **/
router.get("/member/mobileshop", memberController.getMobileshop);
router.post("/member/login", guard(loginLimiter), guard(validateLogin), memberController.login);
router.post(
  "/member/logout",
  memberController.verifyAuth,
  memberController.logout
);
router.post("/member/signup", guard(signupLimiter), guard(validateSignup), memberController.signup);
router.get(
  "/member/detail",
  memberController.verifyAuth,
  memberController.getMemberDetail
);

router.post(
  "/member/update",
  memberController.verifyAuth,
  uploader("members").single("memberImage"),
  guard(validateMemberUpdate),
  memberController.updateMember
);
router.get("/member/top-users", memberController.getTopUsers);

/** Product */
router.get("/product/all", productController.getProducts);
router.get(
  "/product/:id",
  memberController.retrieveAuth,
  productController.getProduct
);

/** Order */
router.post(
  "/order/create",
  memberController.verifyAuth,
  guard(validateOrderCreate),
  orderController.createOrder
);

router.get(
  "/order/all",
  memberController.verifyAuth,
  orderController.getMyOrders
);
router.post(
  "/order/update",
  memberController.verifyAuth,
  guard(validateOrderUpdate),
  orderController.updateOrder
);

export default router;
