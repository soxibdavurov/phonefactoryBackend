import mongoose, { Schema } from "mongoose";
import { TargetType } from "../libs/enums/engagement.enum";

const commentSchema = new Schema(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Member",
    },
    memberNick: {
      type: String,
      required: true,
    },
    memberImage: {
      type: String,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    targetType: {
      type: String,
      enum: TargetType,
      required: true,
    },
    commentText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

commentSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });

export default mongoose.model("Comment", commentSchema);
