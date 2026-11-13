import express from "express";
const routerAdmin = express.Router();
import mobileshopController from "./controllers/mobileshop.controller";
import productController from "./controllers/product.controller";
import blogController from "./controllers/blog.controller";
import makeUploader from "./libs/utils/uploader";

/** Mobileshop */
routerAdmin.get("/home", mobileshopController.goHome);
routerAdmin
  .get("/login", mobileshopController.getLogin)
  .post("/login", mobileshopController.processLogin);

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
routerAdmin.get(
  "/product/edit/:id",
  mobileshopController.verifyMobileshop,
  productController.getChosenProduct
);
routerAdmin.post(
  "/product/edit/:id",
  mobileshopController.verifyMobileshop,
  makeUploader("products").array("productImages", 5),
  productController.updateProductDetails
);
routerAdmin.post(
  "/product/:id",
  mobileshopController.verifyMobileshop,
  productController.updateChosenProduct
);

/** Blog */
routerAdmin.get(
  "/blog/all",
  mobileshopController.verifyMobileshop,
  blogController.getAllBlogs
);
routerAdmin.get(
  "/blog/edit/:id",
  mobileshopController.verifyMobileshop,
  blogController.getChosenBlog
);
routerAdmin.post(
  "/blog/create",
  mobileshopController.verifyMobileshop,
  makeUploader("blogs").single("blogImage"),
  blogController.createBlog
);
routerAdmin.post(
  "/blog/edit/:id",
  mobileshopController.verifyMobileshop,
  makeUploader("blogs").single("blogImage"),
  blogController.updateBlog
);
routerAdmin.post(
  "/blog/:id",
  mobileshopController.verifyMobileshop,
  blogController.updateBlogStatus
);

/** User */
routerAdmin.get("/user/barcha", (_req, res) => res.redirect("/admin/user/all"));
routerAdmin.get(
  "/user/all",
  mobileshopController.verifyMobileshop,
  mobileshopController.getUsers
);
routerAdmin.post(
  "/user/edit",
  mobileshopController.verifyMobileshop,
  mobileshopController.updateChosenUser
);

export default routerAdmin;
