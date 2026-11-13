import {
    Product,
    ProductInput,
    ProductInquiry,
    ProductUpdateInput
} from "../libs/types/product";
import Errors, { HttpCode, Message } from "../libs/Errors";
import ProductModel from "../schema/Product.model";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { ProductStatus } from "../libs/enums/products.enum";
import { T } from "../libs/types/common";
import { ObjectId } from "mongoose";
import ViewService from "./View.service";
import { ViewInput } from "../libs/types/view";
import { ViewGroup } from "../libs/enums/view.enum";
import { TargetType } from "../libs/enums/engagement.enum";
import LikeModel from "../schema/Like.model";
import { likedFields } from "../libs/utils/likedLookup";

class ProductService {
    private readonly productModel;
    public viewService;

    constructor() {
        this.productModel = ProductModel;
        this.viewService = new ViewService();
    }

    /** SPA */


    public async getProducts(
        inquiry: ProductInquiry,
        memberId: ObjectId | null = null
    ): Promise<Product[]> {
        const match: T = { productStatus: ProductStatus.PROCESS };

        if (inquiry.productCollection)
            match.productCollection = inquiry.productCollection;
        if (inquiry.productBrand)
            match.productBrand = {
                $regex: new RegExp(`^${inquiry.productBrand}$`, "i"), // "i" = case-insensitive
            };
        if (inquiry.search) {
            const regex = new RegExp(inquiry.search, "i");
            match.$or = [
                { productName: regex },
                { "translations.ru.productName": regex },
                { "translations.ko.productName": regex },
                { "translations.uz.productName": regex },
            ];
        }

        const sort: T = inquiry.order === "productPrice"
            ? { [inquiry.order]: 1 }
            : { [inquiry.order]: -1 };

        const actorId = memberId ? shapeIntoMongooseObjectId(memberId) : null;
        const result = await this.productModel.aggregate([
            { $match: match },
            { $sort: sort },
            { $skip: (inquiry.page * 1 - 1) * inquiry.limit },
            { $limit: inquiry.limit * 1 },
            ...likedFields(actorId, TargetType.PRODUCT),
        ]).exec();

        if (!result) return [];

        return result;
    }

    public async getProduct(memberId: ObjectId | null,
        id: string
    ): Promise<Product> {
        const productId = shapeIntoMongooseObjectId(id);

        let result = await this.productModel
            .findOne({
                _id: productId,
                productStatus: ProductStatus.PROCESS,
            }).exec();


        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);

        if (memberId) {
            //Check existence
            const input: ViewInput = {
                memberId: memberId,
                viewRefId: productId,
                viewGroup: ViewGroup.PRODUCT,
            };
            const existView = await this.viewService.checkViewExistence(input);

            console.log("existv:", existView);
            if (!existView) {
                //Insert view
                console.log("Planning to insert new view");
                await this.viewService.insertMemberView(input);


                //Increase counts
                result = await this.productModel.findByIdAndUpdate(productId,
                    { $inc: { productViews: +1 } },
                    { new: true }
                )
                    .exec();

            }
        }

        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);

        const liked = memberId
            ? Boolean(
                await LikeModel.exists({
                    memberId,
                    targetId: productId,
                    targetType: TargetType.PRODUCT,
                })
            )
            : false;

        return { ...result.toObject(), liked };
    }

    /** SSR */

    public async getAllProducts(): Promise<Product[]> {
        return await this.productModel
            .find()
            .sort({ updatedAt: -1 })
            .exec();
    }

    public async getChosenProduct(id: string): Promise<Product> {
        const result = await this.productModel
            .findById(shapeIntoMongooseObjectId(id))
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);
        return result;
    }

    public async updateProductFields(id: string, set: T, unset: T): Promise<Product> {
        const update: T = { $set: set };
        if (Object.keys(unset).length) update.$unset = unset;
        const result = await this.productModel
            .findByIdAndUpdate(shapeIntoMongooseObjectId(id), update, { new: true })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UP_FAIL);
        return result;
    }


    public async createNewProduct(input: ProductInput): Promise<Product> {
        try {

            const doc = new this.productModel(input);
            await doc.save();
            return doc;
        } catch (err) {
            console.error("error", err)
            throw new Errors(HttpCode.BAD_REQUEST, Message.CR_FAIL);
        }
    }


    public async updateChosenProduct(
        id: string,
        input: ProductUpdateInput
    ): Promise<Product> {
        id = shapeIntoMongooseObjectId(id);
        const result = await this.productModel.findByIdAndUpdate({ _id: id }, input,
            { new: true })
            .exec();
        if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UP_FAIL);

        console.log(result);
        return result;
    }

}

export default ProductService;