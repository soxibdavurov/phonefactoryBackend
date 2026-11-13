import { Request, Response } from "express";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common"
import ProductService from "../models/Product.service";
import { ProductInput, ProductInquiry } from "../libs/types/product";
import { AdminRequest, ExtendedRequest } from "../libs/types/member";
import { ProductBrand, ProductCollection, ProductSize, ProductStatus, TariffType } from "../libs/enums/products.enum";
import { localize, translationsFromBody } from "../libs/utils/contentLang";

const PRODUCT_TEXT = ["productName", "productDesc"];

const productService = new ProductService;

const productController: T = {};

/** SPA */
productController.getProducts = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('getProducts');

        const { page, limit, order, productCollection, productBrand, search } = req.query;
        const inquiry: ProductInquiry = {
            order: String(order),
            page: Number(page),
            limit: Number(limit),
        };
        if (productCollection)
            inquiry.productCollection = productCollection as ProductCollection;
        if (productBrand)
            inquiry.productBrand = productBrand as ProductBrand;
        if (search) inquiry.search = String(search);

        const result = await productService.getProducts(
            inquiry,
            req.member?._id ?? null
        );

        res.status(HttpCode.OK).json(result.map((item) => localize(item, req.query.lang, PRODUCT_TEXT)));
    } catch (err) {
        console.log("Error, getProducts", err);
        if (err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
        //res.json({ });
    }
};

productController.getProduct = async (req: ExtendedRequest, res: Response) => {
    try {
        console.log('getProduct');
        const { id } = req.params;
        const memberId = req.member?._id ?? null,
            result = await productService.getProduct(memberId, id);

        res.status(HttpCode.OK).json(localize(result, req.query.lang, PRODUCT_TEXT));
    } catch (err) {
        console.log("Error, getProduct", err);
        if (err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
        //res.json({ });
    }
};

/** SSR */

productController.getAllProducts = async (req: AdminRequest, res: Response) => {
    try {
        console.log('getAllProducts');
        const data = await productService.getAllProducts();
        res.render("products", { products: data });
    } catch (err) {
        console.log("Error, getAllProducts", err);
        if (err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
        //res.json({ });
    }
};

productController.createNewProduct = async (req: AdminRequest, res: Response) => {
    try {
        console.log('createNewProduct');
        console.log(req.files);

        if (!req.files?.length)
            throw new Errors(HttpCode.INTERNAL_SERVER_ERROR, Message.CR_FAIL);

        const data: ProductInput = req.body;
        (data as T).translations = translationsFromBody(req.body, PRODUCT_TEXT);
        data.productImages = req.files?.map((ele) => {
            return ele.path.replace(/\\/g, "/");
        });
        await productService.createNewProduct(data);

        res.send(`
            <script>alert("Sucessfull creation!"); window.location.replace('/admin/product/all');</script>`);

    } catch (err) {
        console.log("Error, createNewProduct", err);
        const message =
            err instanceof Errors ? err.message : Message.SMT_WENT_WR;
        res.send(`<script>alert("${message}"); window.location.replace('/admin/product/all');</script>`);
    }
};

productController.getChosenProduct = async (req: AdminRequest, res: Response) => {
    try {
        const product = await productService.getChosenProduct(req.params.id);
        res.render("edit-product", {
            product,
            collections: Object.values(ProductCollection),
            brands: Object.values(ProductBrand),
            sizes: Object.values(ProductSize),
            tariffs: Object.values(TariffType),
            statuses: [
                { value: ProductStatus.PAUSE, label: "Draft" },
                { value: ProductStatus.PROCESS, label: "Published" },
                { value: ProductStatus.DELETE, label: "Archived" },
            ],
        });
    } catch (err) {
        console.log("Error, getChosenProduct", err);
        const message = err instanceof Errors ? err.message : Message.N_D_F;
        res.send(`<script>alert("${message}"); window.location.replace('/admin/product/all');</script>`);
    }
};

productController.updateProductDetails = async (req: AdminRequest, res: Response) => {
    try {
        const body = req.body;
        const productName = String(body.productName || "").trim();
        const productPrice = Number(body.productPrice);
        const productLeftCount = Number(body.productLeftCount);
        if (!productName || Number.isNaN(productPrice) || Number.isNaN(productLeftCount) || !body.productCollection) {
            throw new Errors(HttpCode.BAD_REQUEST, Message.UP_FAIL);
        }

        const set: T = {
            productName,
            productPrice,
            productLeftCount,
            productDiscount: body.productDiscount === "" || body.productDiscount == null ? 0 : Number(body.productDiscount),
            productDesc: String(body.productDesc || ""),
            productCollection: body.productCollection,
            isNew: body.isNew === "true" || body.isNew === "on" || body.isNew === true,
        };
        if (Object.values(ProductStatus).includes(body.productStatus)) set.productStatus = body.productStatus;
        if (body.productBrand) set.productBrand = body.productBrand;
        if (body.productSize) set.productSize = body.productSize;
        if (body.tariffType) set.tariffType = body.tariffType;
        set.translations = translationsFromBody(body, PRODUCT_TEXT);

        const files = (req.files || []) as Express.Multer.File[];
        if (files.length) {
            set.productImages = files.map((file) => file.path.replace(/\\/g, "/"));
        }

        const unset: T = {};
        if (!body.productBrand) unset.productBrand = 1;
        if (!body.productSize) unset.productSize = 1;
        if (!body.tariffType) unset.tariffType = 1;

        await productService.updateProductFields(req.params.id, set, unset);
        res.send(`<script>alert("Product updated"); window.location.replace('/admin/product/all');</script>`);
    } catch (err) {
        console.log("Error, updateProductDetails", err);
        const message = err instanceof Errors ? err.message : Message.SMT_WENT_WR;
        res.send(`<script>alert("${message}"); window.location.replace('/admin/product/all');</script>`);
    }
};

productController.updateChosenProduct = async (req: Request, res: Response) => {
    try {
        console.log('updateChosenProduct');
        const id = req.params.id;

        const result = await productService.updateChosenProduct(id, req.body);
        res.status(HttpCode.OK).json({ data: result });
    } catch (err) {
        console.log("Error, updateChosenProduct", err);
        if (err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
        //res.json({ });
    }
};

export default productController;

