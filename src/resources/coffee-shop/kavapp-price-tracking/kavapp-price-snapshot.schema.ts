import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { KavappPriceResponse } from "../../../integrations/kavapp/types/inventory/kavapp-price-item";

export type KavappPriceSnapshotDocument = KavappPriceSnapshot & Document;

@Schema({ timestamps: true })
export class KavappPriceSnapshot {
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "CoffeeShop" })
    coffeeShopId!: mongoose.Types.ObjectId;

    @Prop({ required: true, default: () => new Date() })
    syncDate!: Date;

    @Prop({ required: true, type: Object })
    prices!: KavappPriceResponse;
}

export const KavappPriceSnapshotSchema = SchemaFactory.createForClass(KavappPriceSnapshot);
KavappPriceSnapshotSchema.index({ coffeeShopId: 1, syncDate: -1 });
