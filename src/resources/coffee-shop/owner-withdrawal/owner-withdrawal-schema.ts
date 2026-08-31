import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type OwnerWithdrawalDocument = OwnerWithdrawal & Document;

@Schema({ timestamps: true })
export class OwnerWithdrawal {
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "CoffeeShop" })
    coffeeShopId!: mongoose.Types.ObjectId;

    @Prop({ required: true })
    withdrawalDate!: Date;

    @Prop({ required: true })
    amount!: number;

    @Prop()
    description?: string;
}

export const OwnerWithdrawalSchema = SchemaFactory.createForClass(OwnerWithdrawal);

OwnerWithdrawalSchema.index({ coffeeShopId: 1 });
