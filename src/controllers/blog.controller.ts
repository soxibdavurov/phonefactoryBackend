import { Request, Response } from "express";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { AdminRequest, ExtendedRequest } from "../libs/types/member";
import { BlogCategory, BlogStatus } from "../libs/enums/blog.enum";
import { BlogInput, BlogInquiry, BlogUpdateInput } from "../libs/types/blog";
import BlogService from "../models/Blog.service";
import { localize, translationsFromBody } from "../libs/utils/contentLang";

const BLOG_TEXT = ["blogTitle", "blogExcerpt", "blogContent", "blogTags"];

const blogService = new BlogService();
const blogController: T = {};

const categories = Object.values(BlogCategory);

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function buildBlogInput(body: any, image?: string): BlogInput {
  const blogTitle = String(body.blogTitle || "").trim();
  const blogContent = String(body.blogContent || "").trim();
  const blogExcerpt =
    String(body.blogExcerpt || "").trim() || blogContent.slice(0, 180);
  const blogCategory = categories.includes(body.blogCategory)
    ? body.blogCategory
    : BlogCategory.OTHER;
  const blogStatus = Object.values(BlogStatus).includes(body.blogStatus)
    ? body.blogStatus
    : BlogStatus.PROCESS;

  if (!blogTitle || !blogContent) {
    throw new Errors(HttpCode.BAD_REQUEST, Message.CR_FAIL);
  }

  const input: BlogInput = {
    blogTitle,
    blogContent,
    blogExcerpt,
    blogCategory,
    blogStatus,
    blogTags: parseTags(body.blogTags),
  };
  if (image) input.blogImage = image;
  input.translations = translationsFromBody(body, BLOG_TEXT);
  return input;
}

blogController.getBlogs = async (req: ExtendedRequest, res: Response) => {
  try {
    const { page, limit, search, category } = req.query;
    const inquiry: BlogInquiry = {
      page: Number(page) || 1,
      limit: Number(limit) || 6,
    };
    if (search) inquiry.search = String(search);
    if (category) inquiry.category = String(category);

    const result = await blogService.getBlogs(inquiry, req.member?._id ?? null);
    res.status(HttpCode.OK).json({
      ...result,
      list: result.list.map((item) => localize(item, req.query.lang, BLOG_TEXT)),
    });
  } catch (err) {
    console.log("Error, getBlogs", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

blogController.getRecentBlogs = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 3;
    const result = await blogService.getRecentBlogs(limit);
    res.status(HttpCode.OK).json(result.map((item) => localize(item, req.query.lang, BLOG_TEXT)));
  } catch (err) {
    console.log("Error, getRecentBlogs", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

blogController.getBlog = async (req: ExtendedRequest, res: Response) => {
  try {
    const result = await blogService.getBlog(req.member?._id ?? null, req.params.id);
    res.status(HttpCode.OK).json({
      ...result,
      blog: localize(result.blog, req.query.lang, BLOG_TEXT),
      prev: result.prev ? localize(result.prev, req.query.lang, BLOG_TEXT) : result.prev,
      next: result.next ? localize(result.next, req.query.lang, BLOG_TEXT) : result.next,
    });
  } catch (err) {
    console.log("Error, getBlog", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

blogController.getAllBlogs = async (req: AdminRequest, res: Response) => {
  try {
    const blogs = await blogService.getAllBlogs();
    res.render("blogs", { blogs, categories });
  } catch (err) {
    console.log("Error, getAllBlogs", err);
    res.redirect("/admin/home");
  }
};

blogController.getChosenBlog = async (req: AdminRequest, res: Response) => {
  try {
    const blog = await blogService.getChosenBlog(req.params.id);
    res.render("edit-blog", { blog, categories });
  } catch (err) {
    console.log("Error, getChosenBlog", err);
    const message = err instanceof Errors ? err.message : Message.N_D_F;
    res.send(
      `<script>alert("${message}"); window.location.replace('/admin/blog/all');</script>`
    );
  }
};

blogController.createBlog = async (req: AdminRequest, res: Response) => {
  try {
    if (!req.file) throw new Errors(HttpCode.BAD_REQUEST, Message.CR_FAIL);
    const image = req.file.path.replace(/\\/g, "/");
    const input = buildBlogInput(req.body, image);
    await blogService.createBlog(input);
    res.send(
      `<script>alert("Blog created"); window.location.replace('/admin/blog/all');</script>`
    );
  } catch (err) {
    console.log("Error, createBlog", err);
    const message = err instanceof Errors ? err.message : Message.SMT_WENT_WR;
    res.send(
      `<script>alert("${message}"); window.location.replace('/admin/blog/all');</script>`
    );
  }
};

blogController.updateBlog = async (req: AdminRequest, res: Response) => {
  try {
    const image = req.file?.path.replace(/\\/g, "/");
    const input: BlogUpdateInput = buildBlogInput(req.body, image);
    await blogService.updateBlog(req.params.id, input);
    res.send(
      `<script>alert("Blog updated"); window.location.replace('/admin/blog/all');</script>`
    );
  } catch (err) {
    console.log("Error, updateBlog", err);
    const message = err instanceof Errors ? err.message : Message.SMT_WENT_WR;
    res.send(
      `<script>alert("${message}"); window.location.replace('/admin/blog/all');</script>`
    );
  }
};

blogController.updateBlogStatus = async (req: Request, res: Response) => {
  try {
    const blogStatus = req.body.blogStatus;
    if (!Object.values(BlogStatus).includes(blogStatus)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.UP_FAIL);
    }
    const result = await blogService.updateBlog(req.params.id, { blogStatus });
    res.status(HttpCode.OK).json({ data: result });
  } catch (err) {
    console.log("Error, updateBlogStatus", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default blogController;
