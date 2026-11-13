import { ObjectId } from "mongoose";
import { BlogCategory, BlogStatus } from "../enums/blog.enum";

export interface Blog {
  _id: ObjectId;
  blogStatus: BlogStatus;
  blogTitle: string;
  blogExcerpt: string;
  blogContent: string;
  blogImage?: string;
  blogCategory: BlogCategory | string;
  blogTags: string[];
  blogViews: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  liked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogInput {
  blogStatus?: BlogStatus;
  blogTitle: string;
  blogExcerpt?: string;
  blogContent: string;
  blogImage?: string;
  blogCategory?: string;
  blogTags?: string[];
  translations?: Record<string, Record<string, string | string[]>>;
}

export interface BlogUpdateInput {
  blogStatus?: BlogStatus;
  blogTitle?: string;
  blogExcerpt?: string;
  blogContent?: string;
  blogImage?: string;
  blogCategory?: string;
  blogTags?: string[];
  translations?: Record<string, Record<string, string | string[]>>;
}

export interface BlogInquiry {
  page: number;
  limit: number;
  search?: string;
  category?: string;
}
