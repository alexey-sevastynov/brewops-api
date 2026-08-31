import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { employeePositionKeys, type EmployeePositionKey } from "./enums/employee-position-key";
import { WithObjectId } from "../../../common/types/with-object-id";

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true })
export class Employee implements WithObjectId {
    _id!: mongoose.Types.ObjectId;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "CoffeeShop" })
    coffeeShopId!: mongoose.Types.ObjectId;

    @Prop({ required: true })
    name!: string;

    @Prop({ default: true })
    isActive!: boolean;

    @Prop({ default: Date.now })
    employmentStartDate!: Date;

    @Prop({ required: true, enum: employeePositionKeys })
    position?: EmployeePositionKey;

    @Prop()
    fixedSalary?: number;

    @Prop()
    phone?: string;

    @Prop()
    birthDate?: Date;

    @Prop()
    employmentEndDate?: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.index({ coffeeShopId: 1 });
