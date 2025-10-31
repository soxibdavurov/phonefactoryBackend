import mongoose, { Schema } from "mongoose";
import {
  ProductBrand,
  ProductCollection,
  ProductSize,
  ProductStatus,
  TariffType,
} from "../libs/enums/products.enum";

const asEnum = <T extends Record<string, string>>(E: T) => Object.values(E);

const sanitizeString = (v: any) => {
  // form-data orqali {} yoki '' kelishini to'xtatish
  if (v === "" || v === null || typeof v === "undefined") return undefined;
  if (typeof v === "object") return undefined; // {} kelib qolsa, enum cast yiqilmasin
  return String(v);
};

const productSchema = new Schema(
  {
    productStatus: {
      type: String,
      enum: asEnum(ProductStatus),
      default: ProductStatus.PAUSE,
      trim: true,
      set: sanitizeString,
    },

    productCollection: {
      type: String,
      enum: asEnum(ProductCollection),
      required: true,
      trim: true,
      set: sanitizeString,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
      set: sanitizeString,
    },

    productPrice: {
      type: Number,
      required: true,
      min: 0,
      set: (v: any) => (v === "" || v === null ? undefined : Number(v)),
    },

    productLeftCount: {
      type: Number,
      required: true,
      min: 0,
      set: (v: any) => (v === "" || v === null ? undefined : Number(v)),
    },

    productSize: {
      type: String,
      enum: asEnum(ProductSize),
      trim: true,
      set: sanitizeString,
    },

    productDesc: {
      type: String,
      trim: true,
      set: sanitizeString,
    },

    productImages: {
      type: [String],
      default: () => [], // array defaultini funksiya bilan
      set: (arr: any) =>
        Array.isArray(arr)
          ? arr.map((x) => (typeof x === "string" ? x : String(x)))
          : [],
    },

    productViews: {
      type: Number,
      default: 0,
    },

    productDiscount: {
      type: Number,
      default: 0,
      set: (v: any) => (v === "" || v === null ? 0 : Number(v)),
    },

    productRate: {
      type: Number,
      default: 0,
    },

    tariffType: {
      type: String,
      enum: asEnum(TariffType),
      trim: true,
      set: sanitizeString,
    },

    isNew: {
      type: Boolean,
      default: false,
      set: (v: any) => {
        if (v === true || v === 'true' || v === 'on' || v === 1 || v === '1') return true;
        if (v === false || v === 'false' || v === 0 || v === '0') return false;
        return undefined; // boshqa qiymat bo'lsa default ishlaydi
      },
    },

    productBrand: {
      type: String,
      enum: asEnum(ProductBrand),
      trim: true,
      set: sanitizeString,
    },
  },
  { timestamps: true }
);

// unique nom uchun indeks
productSchema.index({ productName: 1 }, { unique: true });

export default mongoose.model("Product", productSchema);
