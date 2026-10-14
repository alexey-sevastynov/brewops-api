import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CreateEmployeeDto } from "./dto/create-employee-dto";
import { UpdateEmployeeDto } from "./dto/update-employee-dto";
import { Employee, EmployeeDocument } from "./employee-schema";
import { errorMessages } from "../../../common/constants/error-messages";

@Injectable()
export class EmployeeService {
    constructor(@InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>) {}

    findEmployee(coffeeShopId: string) {
        return this.employeeModel.find({ coffeeShopId }).exec();
    }

    async findByIdEmployee(id: string, coffeeShopId: string) {
        const employee = await this.employeeModel.findOne({ _id: id, coffeeShopId }).exec();

        if (!employee) throw new NotFoundException(errorMessages.notFound.replace("{0}", Employee.name));

        return employee;
    }

    createEmployee(dto: CreateEmployeeDto, coffeeShopId: string) {
        const employee = new this.employeeModel({ ...dto, coffeeShopId });

        return employee.save();
    }

    async updateEmployee(id: string, dto: UpdateEmployeeDto, coffeeShopId: string) {
        const updated = await this.employeeModel.findOneAndUpdate({ _id: id, coffeeShopId }, dto, {
            new: true,
        });

        if (!updated) throw new NotFoundException(errorMessages.notFound.replace("{0}", Employee.name));

        return updated;
    }

    async deleteEmployee(id: string, coffeeShopId: string) {
        const deleted = await this.employeeModel.findOneAndDelete({ _id: id, coffeeShopId });

        if (!deleted) throw new NotFoundException(errorMessages.notFound.replace("{0}", Employee.name));
    }

    async deleteAllEmployee(coffeeShopId: string) {
        const result = await this.employeeModel.deleteMany({ coffeeShopId });

        return { deletedCount: result.deletedCount };
    }
}
