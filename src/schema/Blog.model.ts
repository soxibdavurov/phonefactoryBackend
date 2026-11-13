import mongoose, { Schema } from "mongoose";
import { BlogCategory, BlogStatus } from "../libs/enums/blog.enum";

const blogSchema = new Schema(
  {
    blogStatus: {
      type: String,
      enum: BlogStatus,
      default: BlogStatus.PROCESS,
    },
    blogTitle: {
      type: String,
      required: true,
      trim: true,
    },
    blogExcerpt: {
      type: String,
      required: true,
      trim: true,
    },
    blogContent: {
      type: String,
      required: true,
    },
    blogImage: {
      type: String,
    },
    blogCategory: {
      type: String,
      enum: BlogCategory,
      default: BlogCategory.NEWS,
    },
    blogTags: {
      type: [String],
      default: [],
    },
    blogViews: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
    },
    translations: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

blogSchema.index({ blogStatus: 1, createdAt: -1 });

export default mongoose.model("Blog", blogSchema);
