import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Employee } from "../../../resources/coffee-shop/employee/employee-schema";
import { type KavappDailySalesAnalytics } from "../../../integrations/kavapp/types/sales/kavapp-sales-analytics.types";

export type DailyReportDocument = DailyReport & Document;

@Schema({ timestamps: true })
export class DailyReport {
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "CoffeeShop" })
    coffeeShopId!: mongoose.Types.ObjectId;

    @Prop({ required: true })
    date!: Date;

    @Prop({ required: true })
    cashRevenue!: number;

    @Prop({ required: true })
    terminalRevenue!: number;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: Employee.name })
    employee!: Employee;

    @Prop({ required: true })
    costOfGoods!: number;

    @Prop({ required: true })
    productWriteOffs!: number;

    @Prop({ default: 0 })
    employeeBonus!: number;

    @Prop()
    employeeTotalSalary?: number;

    @Prop()
    acquiringFee?: number;

    @Prop()
    totalRevenue?: number;

    @Prop()
    netProfit?: number;

    @Prop()
    salaryPercent?: number;

    @Prop()
    costPercent?: number;

    @Prop()
    writeOffPercent?: number;

    @Prop()
    cashPercent?: number;

    @Prop()
    terminalPercent?: number;

    @Prop({ type: Object })
    kavappSales?: KavappDailySalesAnalytics;
}

export const DailyReportSchema = SchemaFactory.createForClass(DailyReport);

DailyReportSchema.index({ coffeeShopId: 1, date: 1 }, { unique: true });
