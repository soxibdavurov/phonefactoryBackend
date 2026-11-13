import { ObjectId } from "mongoose";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { BlogStatus } from "../libs/enums/blog.enum";
import { TargetType } from "../libs/enums/engagement.enum";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { Blog, BlogInput, BlogInquiry, BlogUpdateInput } from "../libs/types/blog";
import { T } from "../libs/types/common";
import { ViewGroup } from "../libs/enums/view.enum";
import { ViewInput } from "../libs/types/view";
import BlogModel from "../schema/Blog.model";
import LikeModel from "../schema/Like.model";
import ViewService from "./View.service";
import { likedFields } from "../libs/utils/likedLookup";

class BlogService {
  private readonly blogModel;
  public viewService;

  constructor() {
    this.blogModel = BlogModel;
    this.viewService = new ViewService();
  }

  public async getBlogs(
    inquiry: BlogInquiry,
    memberId: ObjectId | null = null
  ): Promise<{ list: Blog[]; total: number }> {
    const match: T = { blogStatus: BlogStatus.PROCESS };

    if (inquiry.category) match.blogCategory = inquiry.category;
    if (inquiry.search) {
      const safe = inquiry.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(safe, "i");
      match.$or = [
        { blogTitle: regex },
        { blogExcerpt: regex },
        { blogContent: regex },
        { blogTags: regex },
        { "translations.ru.blogTitle": regex },
        { "translations.ko.blogTitle": regex },
        { "translations.uz.blogTitle": regex },
        { "translations.ru.blogContent": regex },
        { "translations.ko.blogContent": regex },
        { "translations.uz.blogContent": regex },
      ];
    }

        const actorId = memberId ? shapeIntoMongooseObjectId(memberId) : null;
        const page = Math.max(1, Number(inquiry.page) || 1);
    const limit = Math.min(24, Math.max(1, Number(inquiry.limit) || 6));

    const [list, total] = await Promise.all([
      this.blogModel
        .aggregate([
          { $match: match },
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          ...likedFields(actorId, TargetType.BLOG),
        ])
        .exec(),
      this.blogModel.countDocuments(match).exec(),
    ]);

    return { list, total };
  }

  public async getRecentBlogs(limit = 3): Promise<Blog[]> {
    const size = Math.min(8, Math.max(1, Number(limit) || 3));
    return await this.blogModel
      .find({ blogStatus: BlogStatus.PROCESS })
      .sort({ createdAt: -1 })
      .limit(size)
      .exec();
  }

  public async getBlog(memberId: ObjectId | null, id: string) {
    const blogId = shapeIntoMongooseObjectId(id);
    let blog = await this.blogModel
      .findOne({ _id: blogId, blogStatus: BlogStatus.PROCESS })
      .exec();

    if (!blog) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);

    if (memberId) {
      const input: ViewInput = {
        memberId,
        viewRefId: blogId,
        viewGroup: ViewGroup.BLOG,
      };
      const existView = await this.viewService.checkViewExistence(input);
      if (!existView) {
        await this.viewService.insertMemberView(input);
        blog = await this.blogModel
          .findByIdAndUpdate(blogId, { $inc: { blogViews: 1 } }, { new: true })
          .exec();
      }
    }

    if (!blog) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);

    const liked = memberId
      ? Boolean(
          await LikeModel.exists({
            memberId,
            targetId: blogId,
            targetType: TargetType.BLOG,
          })
        )
      : false;

    const [prev, next] = await Promise.all([
      this.blogModel
        .findOne({
          blogStatus: BlogStatus.PROCESS,
          createdAt: { $lt: blog.createdAt },
        })
        .sort({ createdAt: -1 })
        .select("_id blogTitle translations")
        .exec(),
      this.blogModel
        .findOne({
          blogStatus: BlogStatus.PROCESS,
          createdAt: { $gt: blog.createdAt },
        })
        .sort({ createdAt: 1 })
        .select("_id blogTitle translations")
        .exec(),
    ]);

    return {
      blog: { ...blog.toObject(), liked },
      prev,
      next,
    };
  }

  public async getAllBlogs(): Promise<Blog[]> {
    return await this.blogModel.find().sort({ updatedAt: -1 }).exec();
  }

  public async getChosenBlog(id: string): Promise<Blog> {
    const blog = await this.blogModel.findById(shapeIntoMongooseObjectId(id)).exec();
    if (!blog) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);
    return blog;
  }

  public async createBlog(input: BlogInput): Promise<Blog> {
    try {
      const doc = new this.blogModel(input);
      await doc.save();
      return doc;
    } catch (err) {
      console.error("Error, createBlog", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CR_FAIL);
    }
  }

  public async updateBlog(id: string, input: BlogUpdateInput): Promise<Blog> {
    const result = await this.blogModel
      .findByIdAndUpdate(shapeIntoMongooseObjectId(id), input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UP_FAIL);
    return result;
  }
}

export default BlogService;
