import express from "express";
const router = express.Router();
import memberController from "./controllers/member.controller";
import uploader from "./libs/utils/uploader";
import productController from "./controllers/product.controller";
import orderController from "./controllers/order.controller";
import blogController from "./controllers/blog.controller";
import engagementController from "./controllers/engagement.controller";

/** Member **/
router.get("/member/mobileshop", memberController.getMobileshop);
router.post("/member/login", memberController.login);
router.post(
  "/member/logout",
  memberController.verifyAuth,
  memberController.logout
);
router.post("/member/signup", memberController.signup);
router.get(
  "/member/detail",
  memberController.verifyAuth,
  memberController.getMemberDetail
);

router.post(
  "/member/update",
  memberController.verifyAuth,
  uploader("members").single("memberImage"),
  memberController.updateMember
);
router.get("/member/top-users", memberController.getTopUsers);

/** Product */
router.get(
  "/product/all",
  memberController.retrieveAuth,
  productController.getProducts
);
router.get(
  "/product/:id",
  memberController.retrieveAuth,
  productController.getProduct
);

/** Order */
router.post(
  "/order/create",
  memberController.verifyAuth,
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
  orderController.updateOrder
);

/** Blog */
router.get(
  "/blog/all",
  memberController.retrieveAuth,
  blogController.getBlogs
);
router.get("/blog/recent", blogController.getRecentBlogs);
router.get(
  "/blog/:id",
  memberController.retrieveAuth,
  blogController.getBlog
);

/** Likes, comments, shares */
router.get(
  "/engagement/state",
  memberController.retrieveAuth,
  engagementController.getState
);
router.get("/engagement/comments", engagementController.getComments);
router.post(
  "/engagement/like",
  memberController.verifyAuth,
  engagementController.toggleLike
);
router.post(
  "/engagement/comment",
  memberController.verifyAuth,
  engagementController.addComment
);
router.post(
  "/engagement/comment/:id/delete",
  memberController.verifyAuth,
  engagementController.deleteComment
);
router.post(
  "/engagement/share",
  memberController.retrieveAuth,
  engagementController.addShare
);

export default router;
