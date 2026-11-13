import mongoose, { Schema } from "mongoose";
import { SharePlatform, TargetType } from "../libs/enums/engagement.enum";

const shareSchema = new Schema(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
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
    platform: {
      type: String,
      enum: SharePlatform,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Share", shareSchema);
