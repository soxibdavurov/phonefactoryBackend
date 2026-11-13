import { ObjectId } from "mongoose";
import { SharePlatform, TargetType } from "../enums/engagement.enum";

export interface EngagementState {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

export interface CommentView {
  _id: ObjectId;
  commentText: string;
  createdAt: Date;
  memberId: ObjectId;
  memberNick: string;
  memberImage?: string;
}

export interface EngagementTargetInput {
  targetId: string;
  targetType: TargetType;
}

export interface CommentInput extends EngagementTargetInput {
  commentText: string;
}

export interface ShareInput extends EngagementTargetInput {
  platform: SharePlatform;
}
