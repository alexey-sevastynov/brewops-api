import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type ExpenseReportType, expenseReportTypes } from "./enums/expense-report-type";

export type ExpenseReportDocument = ExpenseReport & Document;

@Schema({ timestamps: true })
export class ExpenseReport {
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "CoffeeShop" })
    coffeeShopId!: mongoose.Types.ObjectId;

    @Prop({ required: true })
    title!: string;

    @Prop({ required: true })
    amount!: number;

    @Prop({ required: true, enum: expenseReportTypes })
    type!: ExpenseReportType;

    @Prop()
    date?: Date;

    @Prop()
    validFrom?: Date;

    @Prop()
    validTo?: Date;

    @Prop()
    description?: string;
}

export const ExpenseReportSchema = SchemaFactory.createForClass(ExpenseReport);

ExpenseReportSchema.index({ coffeeShopId: 1 });
