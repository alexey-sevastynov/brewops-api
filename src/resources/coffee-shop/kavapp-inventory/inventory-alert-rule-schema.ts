import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { KavappInventoryItemType } from "../../../integrations/kavapp/types/inventory/kavapp-inventory-item";
import { kavappInventoryTypes } from "../../../integrations/kavapp/constants/kavapp-inventory-types";

export type InventoryAlertRuleDocument = InventoryAlertRule & Document;

@Schema({ timestamps: true })
export class InventoryAlertRule {
    createdAt?: Date;
    updatedAt?: Date;

    @Prop({
        required: true,
        enum: [
            kavappInventoryTypes.ingredient,
            kavappInventoryTypes.cup,
            kavappInventoryTypes.product,
            kavappInventoryTypes.kitchen,
        ],
    })
    itemType!: KavappInventoryItemType;

    @Prop({ required: true })
    kavappItemId!: string;

    @Prop({ required: true })
    name!: string;

    @Prop({ required: false, default: "" })
    unit!: string;

    @Prop({ required: true, min: 0, default: 0 })
    threshold!: number;

    @Prop()
    description?: string;
}

export const InventoryAlertRuleSchema = SchemaFactory.createForClass(InventoryAlertRule);

InventoryAlertRuleSchema.index({ itemType: 1, kavappItemId: 1 }, { unique: true });
