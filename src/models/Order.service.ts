import { Member } from "../libs/types/member";
import OrderModel from "../schema/Order.model";
import OrderItemModel from "../schema/OrderItem.model";
import { Order, OrderInquiry, OrderItemInput, OrderUpdateInput } from "../libs/types/order";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { Message } from "../libs/Errors";
import { HttpCode } from "../libs/Errors";
import {ObjectId} from "mongoose";
import { OrderStatus } from "../libs/enums/order.enum";
import MemberService from "./Member.service";

class OrderService {
    private readonly orderModel;
    private readonly orderItemModel;
    private readonly memberService;

    constructor() {
        this.orderModel = OrderModel;
        this.orderItemModel = OrderItemModel;
        this.memberService = new MemberService();
    }

    public async createOrder(
        member: Member, 
        input: OrderItemInput[]): 
    Promise<Order> {
       const memberId = shapeIntoMongooseObjectId(member._id);
       const amount = input.reduce((accumlator: number, item: OrderItemInput) => {
        return accumlator + item.itemPrice * item.itemQuantity;
       }, 0);
       const delivery = amount <100 ? 5:0;

       try {
        const newOrder: Order = await this.orderModel.create({
            orderTotal: amount +delivery,
            orderDelivery: delivery,
            memberId: memberId,
        });

        const orderId = newOrder._id;
        console.log("orderId", newOrder._id);
        await this.recordOrderItem(orderId, input);
        return newOrder;

       } catch(err) {
        console.log("Error, model: createOrder", err);
        throw new Errors(HttpCode.BAD_REQUEST, Message.CR_FAIL);
       }
    }

    private async recordOrderItem(orderId: ObjectId, 
        input: OrderItemInput[])
    : Promise<void> {
       const promisedList =  input.map(async(item:OrderItemInput) => {
            item.orderId = orderId;
            item.productId = shapeIntoMongooseObjectId(item.productId);
            
            return await this.orderItemModel.create(item);
        });

        const orderItemsState = await Promise.all(promisedList);
        console.log("orderItemState:", orderItemsState);
    }

public async getMyOrders(
    member:Member,
    inquiry: OrderInquiry
): Promise<Order[]> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const matches = {memberId: memberId, orderStatus: inquiry.orderStatus};

    const result = await this.orderModel.aggregate([
        {$match: matches},
        {$sort: {updatedAt: -1}},
        {$skip: (inquiry.page -1) * inquiry.limit},
        {$limit: inquiry.limit},
        {
            $lookup: {
                from: "orderItems",
                localField: "_id",
                foreignField: "orderId",
                as: "orderItems",
            },
        },
        {
            $lookup: {
                from: "products",
                localField: "orderItems.productId",
                foreignField: "_id",
                as: "productData"
            },
        }
    ])
    .exec();

    if(!result) throw new Errors(HttpCode.NOT_FOUND, Message.N_D_F);

    return result;
    }

  public async updateOrder(
    member: Member,
    input: OrderUpdateInput
  ): Promise<Order> {
    console.log("BU YANGI", input)
    const memberId = shapeIntoMongooseObjectId(member._id),
      orderId = shapeIntoMongooseObjectId(input.orderId),
      orderStatus = input.orderStatus;
     
    const result = await this.orderModel
      .findOneAndUpdate(
        {
          memberId: memberId,
          _id: orderId,
        },
        { orderStatus: orderStatus },
        { new: true }
      )
      .exec();

      console.log("result", result)

    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UP_FAIL);

    // orderStatus Pause => PROCESS + 1 point
    if(orderStatus === OrderStatus.PROCESS) {
      await this.memberService.addUserPoint(member, 1)
    }

    return result;
  }
}

export default OrderService;