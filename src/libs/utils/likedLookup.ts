import { ObjectId } from "mongoose";
import { TargetType } from "../enums/engagement.enum";

export function likedFields(memberId: ObjectId | null, targetType: TargetType) {
  if (!memberId) {
    return [{ $addFields: { liked: false } }];
  }

  return [
    {
      $lookup: {
        from: "likes",
        let: { tid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$targetId", "$$tid"] },
                  { $eq: ["$memberId", memberId] },
                  { $eq: ["$targetType", targetType] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "likeDocs",
      },
    },
    { $addFields: { liked: { $gt: [{ $size: "$likeDocs" }, 0] } } },
    { $project: { likeDocs: 0 } },
  ];
}
