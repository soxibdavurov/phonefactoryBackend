import { ObjectId } from "mongoose";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { BlogStatus } from "../libs/enums/blog.enum";
import { ProductStatus } from "../libs/enums/products.enum";
import { SharePlatform, TargetType } from "../libs/enums/engagement.enum";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { CommentView, EngagementState } from "../libs/types/engagement";
import { Member } from "../libs/types/member";
import BlogModel from "../schema/Blog.model";
import CommentModel from "../schema/Comment.model";
import LikeModel from "../schema/Like.model";
import ProductModel from "../schema/Product.model";
import ShareModel from "../schema/Share.model";

class EngagementService {
  private readonly likeModel;
  private readonly commentModel;
  private readonly shareModel;
  private readonly productModel;
  private readonly blogModel;

  constructor() {
    this.likeModel = LikeModel;
    this.commentModel = CommentModel;
    this.shareModel = ShareModel;
    this.productModel = ProductModel;
    this.blogModel = BlogModel;
  }

  private modelFor(targetType: TargetType) {
    return targetType === TargetType.PRODUCT ? this.productModel : this.blogModel;
  }

  private async loadTarget(targetType: TargetType, targetId: string) {
    const id = shapeIntoMongooseObjectId(targetId);
    const filter =
      targetType === TargetType.PRODUCT
        ? { _id: id, productStatus: ProductStatus.PROCESS }
        : { _id: id, blogStatus: BlogStatus.PROCESS };

    const doc = await this.modelFor(targetType).findOne(filter).exec();
    if (!doc) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);
    return doc;
  }

  private stateFrom(doc: any, liked: boolean): EngagementState {
    return {
      liked,
      likeCount: doc.likeCount ?? 0,
      commentCount: doc.commentCount ?? 0,
      shareCount: doc.shareCount ?? 0,
    };
  }

  private async adjust(targetType: TargetType, targetId: any, field: string, delta: number) {
    const doc = await this.modelFor(targetType)
      .findByIdAndUpdate(targetId, { $inc: { [field]: delta } }, { new: true })
      .exec();

    if (doc && doc[field] < 0) {
      doc[field] = 0;
      await doc.save();
    }
    return doc;
  }

  public async getState(
    memberId: ObjectId | null,
    targetType: TargetType,
    targetId: string
  ): Promise<EngagementState> {
    const doc = await this.loadTarget(targetType, targetId);
    const liked = memberId
      ? Boolean(
          await this.likeModel.exists({
            memberId,
            targetId: doc._id,
            targetType,
          })
        )
      : false;
    return this.stateFrom(doc, liked);
  }

  public async getComments(targetType: TargetType, targetId: string): Promise<CommentView[]> {
    const id = shapeIntoMongooseObjectId(targetId);
    return await this.commentModel
      .aggregate([
        { $match: { targetId: id, targetType } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "members",
            localField: "memberId",
            foreignField: "_id",
            as: "member",
          },
        },
        { $unwind: { path: "$member", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            commentText: 1,
            createdAt: 1,
            memberId: 1,
            memberNick: { $ifNull: ["$member.memberNick", "$memberNick"] },
            memberImage: { $ifNull: ["$member.memberImage", "$memberImage"] },
          },
        },
      ])
      .exec();
  }

  public async toggleLike(
    member: Member,
    targetType: TargetType,
    targetId: string
  ): Promise<EngagementState> {
    const doc = await this.loadTarget(targetType, targetId);
    const filter = {
      memberId: member._id,
      targetId: doc._id,
      targetType,
    };
    const existing = await this.likeModel.findOne(filter).exec();

    if (existing) {
      await this.likeModel.deleteOne({ _id: existing._id }).exec();
      const updated = await this.adjust(targetType, doc._id, "likeCount", -1);
      return this.stateFrom(updated, false);
    }

    await this.likeModel.create(filter);
    const updated = await this.adjust(targetType, doc._id, "likeCount", 1);
    return this.stateFrom(updated, true);
  }

  public async addComment(
    member: Member,
    targetType: TargetType,
    targetId: string,
    commentText: string
  ): Promise<CommentView> {
    const text = commentText?.trim();
    if (!text) throw new Errors(HttpCode.BAD_REQUEST, Message.COMMENT_REQUIRED);
    if (text.length > 1000) throw new Errors(HttpCode.BAD_REQUEST, Message.COMMENT_REQUIRED);

    const doc = await this.loadTarget(targetType, targetId);
    const created = await this.commentModel.create({
      memberId: member._id,
      memberNick: member.memberNick,
      memberImage: member.memberImage,
      targetId: doc._id,
      targetType,
      commentText: text,
    });
    await this.adjust(targetType, doc._id, "commentCount", 1);

    return {
      _id: created._id,
      commentText: created.commentText,
      createdAt: created.createdAt,
      memberId: created.memberId,
      memberNick: created.memberNick,
      memberImage: created.memberImage,
    };
  }

  public async deleteComment(member: Member, commentId: string): Promise<EngagementState> {
    const comment = await this.commentModel
      .findById(shapeIntoMongooseObjectId(commentId))
      .exec();
    if (!comment) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);
    if (String(comment.memberId) !== String(member._id)) {
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_OWNER);
    }

    await this.commentModel.deleteOne({ _id: comment._id }).exec();
    const updated = await this.adjust(
      comment.targetType,
      comment.targetId,
      "commentCount",
      -1
    );
    const liked = Boolean(
      await this.likeModel.exists({
        memberId: member._id,
        targetId: comment.targetId,
        targetType: comment.targetType,
      })
    );
    return this.stateFrom(updated, liked);
  }

  public async addShare(
    memberId: ObjectId | null,
    targetType: TargetType,
    targetId: string,
    platform: SharePlatform
  ): Promise<EngagementState> {
    if (!Object.values(SharePlatform).includes(platform)) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.SMT_WENT_WR);
    }
    const doc = await this.loadTarget(targetType, targetId);
    await this.shareModel.create({
      memberId: memberId ?? undefined,
      targetId: doc._id,
      targetType,
      platform,
    });
    const updated = await this.adjust(targetType, doc._id, "shareCount", 1);
    const liked = memberId
      ? Boolean(
          await this.likeModel.exists({
            memberId,
            targetId: doc._id,
            targetType,
          })
        )
      : false;
    return this.stateFrom(updated, liked);
  }
}

export default EngagementService;
