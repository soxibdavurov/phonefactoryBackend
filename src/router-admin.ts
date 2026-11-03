import express from "express";
const routerAdmin = express.Router();
import mobileshopController from "./controllers/mobileshop.controller";
import productController from "./controllers/product.controller";
import makeUploader from "./libs/utils/uploader";
import { loginLimiter } from "./libs/security/rateLimit";
import { SECURITY_ON } from "./libs/security/flag";
import { RequestHandler } from "express";
const guard = (mw: RequestHandler): RequestHandler =>
  SECURITY_ON ? mw : (_req, _res, next) => next();

/** Mobileshop */
routerAdmin.get("/home", mobileshopController.goHome);
routerAdmin
  .get("/login", mobileshopController.getLogin)
  .post("/login", guard(loginLimiter), mobileshopController.processLogin);

routerAdmin
  .get("/login-signup", mobileshopController.getSignup)
  .post(
    "/signup",
    makeUploader("members").single("memberImage"),
    mobileshopController.processSignup
  );
routerAdmin.get("/logout", mobileshopController.logout);
routerAdmin.get("/checkme", mobileshopController.checkAuthSession);
routerAdmin.get("/create-user");

/** Product */
routerAdmin.get(
  "/product/all",
  mobileshopController.verifyMobileshop,
  productController.getAllProducts
);
routerAdmin.post(
  "/product/create",
  mobileshopController.verifyMobileshop,
  makeUploader("products").array("productImages", 5),
  // makeUploader.single("productImage"),
  productController.createNewProduct
);
routerAdmin.post(
  "/product/:id",
  mobileshopController.verifyMobileshop,
  productController.updateChosenProduct
);

/** User */
routerAdmin.get(
  "/user/barcha",
  mobileshopController.verifyMobileshop,
  mobileshopController.getUsers
);
routerAdmin.post(
  "/user/edit",
  mobileshopController.verifyMobileshop,
  mobileshopController.updateChosenUser
);

export default routerAdmin;
