import { Model } from "mongoose";
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CreateExpenseReportDto } from "./dto/create-expense-report-dto";
import { UpdateExpenseReportDto } from "./dto/update-expense-report-dto";
import { ExpenseReport, ExpenseReportDocument } from "./expense-report-schema";

@Injectable()
export class ExpenseReportService {
    constructor(
        @InjectModel(ExpenseReport.name)
        private readonly model: Model<ExpenseReportDocument>,
    ) {}

    findAllExpenseReport(coffeeShopId: string) {
        return this.model.find({ coffeeShopId }).sort({ createdAt: -1 });
    }

    async findByIdExpenseReport(id: string, coffeeShopId: string) {
        const report = await this.model.findOne({ _id: id, coffeeShopId });

        if (!report) {
            throw new NotFoundException("ExpenseReport not found");
        }

        return report;
    }

    async createExpenseReport(dto: CreateExpenseReportDto, coffeeShopId: string) {
        const data = this.normalize(dto);

        const created = await this.model.create({
            ...data,
            coffeeShopId,
        });

        return created;
    }

    async updateExpenseReport(id: string, dto: UpdateExpenseReportDto, coffeeShopId: string) {
        const report = await this.model.findOne({ _id: id, coffeeShopId });

        if (!report) {
            throw new NotFoundException("ExpenseReport not found");
        }

        const updatedData = this.normalize({
            ...report.toObject(),
            ...dto,
        });

        Object.assign(report, updatedData);

        return report.save();
    }

    async deleteExpenseReport(id: string, coffeeShopId: string) {
        const deleted = await this.model.findOneAndDelete({ _id: id, coffeeShopId });

        if (!deleted) {
            throw new NotFoundException("ExpenseReport not found");
        }

        return { success: true };
    }

    async deleteAllExpenseReports(coffeeShopId: string) {
        const result = await this.model.deleteMany({ coffeeShopId });
        return { deletedCount: result.deletedCount };
    }

    private normalize(dto: Partial<CreateExpenseReportDto>) {
        return {
            ...dto,
            validFrom: this.toDate(dto.validFrom),
            validTo: this.toDate(dto.validTo),
            date: this.toDate(dto.date),
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
}
