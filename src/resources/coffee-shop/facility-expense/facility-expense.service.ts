import { Model } from "mongoose";
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CreateFacilityExpenseDto } from "./dto/create-facility-expense-dto";
import { UpdateFacilityExpenseDto } from "./dto/update-facility-expense-dto";
import { FacilityExpense, FacilityExpenseDocument } from "./facility-expense-schema";

@Injectable()
export class FacilityExpenseService {
    constructor(
        @InjectModel(FacilityExpense.name)
        private readonly model: Model<FacilityExpenseDocument>,
    ) {}

    findAllFacilityExpense(coffeeShopId: string) {
        return this.model.find({ coffeeShopId }).sort({ createdAt: -1 });
    }

    async findByIdFacilityExpense(id: string, coffeeShopId: string) {
        const expense = await this.model.findOne({ _id: id, coffeeShopId });

        if (!expense) {
            throw new NotFoundException("FacilityExpense not found");
        }

        return expense;
    }

    async createFacilityExpense(dto: CreateFacilityExpenseDto, coffeeShopId: string) {
        const data = this.normalize(dto);
        const created = await this.model.create({
            ...data,
            coffeeShopId,
        });

        return created;
    }

    async updateFacilityExpense(id: string, dto: UpdateFacilityExpenseDto, coffeeShopId: string) {
        const expense = await this.model.findOne({ _id: id, coffeeShopId });

        if (!expense) {
            throw new NotFoundException("FacilityExpense not found");
        }

        const updatedData = this.normalize({
            ...expense.toObject(),
            ...dto,
        });

        Object.assign(expense, updatedData);

        return expense.save();
    }

    async deleteFacilityExpense(id: string, coffeeShopId: string) {
        const deleted = await this.model.findOneAndDelete({ _id: id, coffeeShopId });

        if (!deleted) {
            throw new NotFoundException("FacilityExpense not found");
        }

        return { success: true };
    }

    async deleteAllFacilityExpenses(coffeeShopId: string) {
        const result = await this.model.deleteMany({ coffeeShopId });
        return { deletedCount: result.deletedCount };
    }

    private normalize(dto: Partial<CreateFacilityExpenseDto>) {
        return {
            ...dto,
            date: this.toDate(dto.date),
            period: this.toPeriodDate(dto.period),
        };
    }

    private toDate(date?: string | Date) {
        if (!date) return undefined;

        const d = new Date(date);

        if (isNaN(d.getTime())) {
            throw new BadRequestException("Invalid date format");
        }

        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }

    private toPeriodDate(date?: string | Date) {
        if (!date) return undefined;

        const d = new Date(date);

        if (isNaN(d.getTime())) {
            throw new BadRequestException("Invalid date format");
        }

        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
    }
}
