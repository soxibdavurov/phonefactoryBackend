import { Response } from "express";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { T } from "../libs/types/common";
import { ExtendedRequest } from "../libs/types/member";
import { SharePlatform, TargetType } from "../libs/enums/engagement.enum";
import EngagementService from "../models/Engagement.service";

const engagementService = new EngagementService();
const engagementController: T = {};

function readTarget(bodyOrQuery: any): { targetId: string; targetType: TargetType } {
  const targetId = String(bodyOrQuery.targetId || "");
  const targetType = bodyOrQuery.targetType as TargetType;
  if (!targetId || !Object.values(TargetType).includes(targetType)) {
    throw new Errors(HttpCode.BAD_REQUEST, Message.SMT_WENT_WR);
  }
  return { targetId, targetType };
}

engagementController.getState = async (req: ExtendedRequest, res: Response) => {
  try {
    const { targetId, targetType } = readTarget(req.query);
    const result = await engagementService.getState(
      req.member?._id ?? null,
      targetType,
      targetId
    );
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getState", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

engagementController.getComments = async (req: ExtendedRequest, res: Response) => {
  try {
    const { targetId, targetType } = readTarget(req.query);
    const result = await engagementService.getComments(targetType, targetId);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getComments", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

engagementController.toggleLike = async (req: ExtendedRequest, res: Response) => {
  try {
    const { targetId, targetType } = readTarget(req.body);
    const result = await engagementService.toggleLike(req.member, targetType, targetId);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, toggleLike", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

engagementController.addComment = async (req: ExtendedRequest, res: Response) => {
  try {
    const { targetId, targetType } = readTarget(req.body);
    const result = await engagementService.addComment(
      req.member,
      targetType,
      targetId,
      String(req.body.commentText || "")
    );
    res.status(HttpCode.CREATED).json(result);
  } catch (err) {
    console.log("Error, addComment", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

engagementController.deleteComment = async (req: ExtendedRequest, res: Response) => {
  try {
    const result = await engagementService.deleteComment(req.member, req.params.id);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, deleteComment", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

engagementController.addShare = async (req: ExtendedRequest, res: Response) => {
  try {
    const { targetId, targetType } = readTarget(req.body);
    const platform = req.body.platform as SharePlatform;
    const result = await engagementService.addShare(
      req.member?._id ?? null,
      targetType,
      targetId,
      platform
    );
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, addShare", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default engagementController;
