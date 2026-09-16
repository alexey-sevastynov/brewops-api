import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type CoffeeShopAccessDocument = CoffeeShopAccess & Document;

export const coffeeShopAccessRoleKeys = {
    custom: "custom",
} as const;

export type CoffeeShopAccessRoleKey =
    (typeof coffeeShopAccessRoleKeys)[keyof typeof coffeeShopAccessRoleKeys];

@Schema({ timestamps: true })
export class CoffeeShopAccess {
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "WorkspaceMember" })
    memberId!: mongoose.Types.ObjectId;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "CoffeeShop" })
    coffeeShopId!: mongoose.Types.ObjectId;

    @Prop({
        required: true,
        type: String,
        default: coffeeShopAccessRoleKeys.custom,
    })
    role!: string;

    @Prop({ type: [String], default: [] })
    permissions!: string[];
}

export const CoffeeShopAccessSchema = SchemaFactory.createForClass(CoffeeShopAccess);

CoffeeShopAccessSchema.index({ memberId: 1, coffeeShopId: 1 }, { unique: true });
CoffeeShopAccessSchema.index({ coffeeShopId: 1 });
CoffeeShopAccessSchema.index({ memberId: 1 });
