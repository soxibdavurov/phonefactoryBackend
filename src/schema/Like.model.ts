import mongoose, { Schema } from "mongoose";
import { TargetType } from "../libs/enums/engagement.enum";

const likeSchema = new Schema(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
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
  },
  { timestamps: true }
);

likeSchema.index({ memberId: 1, targetId: 1, targetType: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);
