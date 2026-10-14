import mongoose, { type HydratedDocument } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type CoffeeShopDocument = HydratedDocument<CoffeeShop>;

@Schema({ timestamps: true })
export class CoffeeShop {
    @Prop({ required: true })
    name!: string;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "Workspace" })
    workspaceId!: mongoose.Types.ObjectId;

    @Prop({ default: true })
    isActive!: boolean;

    @Prop()
    description?: string;

    @Prop()
    address?: string;

    @Prop()
    telegramChatId?: string;

    @Prop()
    kavappEmail?: string;

    @Prop()
    kavappPassword?: string;

    @Prop()
    kavappPointId?: string;
}

export const CoffeeShopEntitySchema = SchemaFactory.createForClass(CoffeeShop);

CoffeeShopEntitySchema.index({ workspaceId: 1 });
