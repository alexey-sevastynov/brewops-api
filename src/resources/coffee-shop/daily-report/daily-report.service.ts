import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { percent, toDecimalPercent } from "../../../common/lib/math";
import { errorMessages } from "../../../common/constants/error-messages";
import { DailyReport, DailyReportDocument } from "./daily-report-schema";
import { Employee, EmployeeDocument } from "../employee/employee-schema";
import { CreateDailyReportDto } from "./dto/create-daily-report-dto";
import { UpdateDailyReportDto } from "./dto/update-daily-report-dto";
import { dailyReportProps } from "./constants/daily-report-props";
import { acquiringPercent } from "./constants/daily-report";
import { DailyReportCalculated } from "./types/daily-report-calculated";
import { DailyReportInput } from "./types/daily-report-input";

@Injectable()
export class DailyReportService {
    constructor(
        @InjectModel(DailyReport.name)
        private readonly dailyModel: Model<DailyReportDocument>,
        @InjectModel(Employee.name)
        private readonly employeeModel: Model<EmployeeDocument>,
    ) {}

    findAllDailyReport(coffeeShopId: string) {
        return this.dailyModel.find({ coffeeShopId }).sort({ date: -1 }).populate(dailyReportProps.employee);
    }

    async findByIdDailyReport(id: string, coffeeShopId: string) {
        const report = await this.dailyModel
            .findOne({ _id: id, coffeeShopId })
            .populate(dailyReportProps.employee);

        if (!report) throw new NotFoundException(errorMessages.notFound.replace("{0}", DailyReport.name));

        return report;
    }

    async createDailyReport(createDailyReportDto: CreateDailyReportDto, coffeeShopId: string) {
        const employee = await this.employeeModel.findOne({
            _id: createDailyReportDto.employee,
            coffeeShopId,
        });

        if (!employee) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", Employee.name));
        }

        const calculatedDailyReportFields = this.getCalculatedDailyReportFields(
            employee,
            createDailyReportDto,
        );

        const dailyReport = await new this.dailyModel({
            ...createDailyReportDto,
            coffeeShopId,
            ...calculatedDailyReportFields,
        }).save();

        return this.dailyModel
            .findById(dailyReport._id)
            .populate(dailyReportProps.employee)
            .orFail(() => new NotFoundException(errorMessages.notFound.replace("{0}", DailyReport.name)));
    }

    async updateDailyReport(id: string, updateDailyReportDto: UpdateDailyReportDto, coffeeShopId: string) {
        const dailyModel = await this.dailyModel.findOne({ _id: id, coffeeShopId });

        if (!dailyModel) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", DailyReport.name));
        }

        Object.assign(dailyModel, updateDailyReportDto);

        const employee = await this.employeeModel.findOne({ _id: dailyModel.employee, coffeeShopId });

        if (!employee) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", Employee.name));
        }

        Object.assign(dailyModel, this.getCalculatedDailyReportFields(employee, dailyModel));

        await dailyModel.save();

        return this.dailyModel
            .findById(id)
            .populate(dailyReportProps.employee)
            .orFail(() => new NotFoundException(errorMessages.notFound.replace("{0}", DailyReport.name)));
    }

    async deleteDailyReport(id: string, coffeeShopId: string) {
        const deleted = await this.dailyModel.findOneAndDelete({ _id: id, coffeeShopId });

        if (!deleted) throw new NotFoundException(errorMessages.notFound.replace("{0}", DailyReport.name));
    }

    async deleteAllDailyReports(coffeeShopId: string) {
        const result = await this.dailyModel.deleteMany({ coffeeShopId });

        return { deletedCount: result.deletedCount };
    }

    private getCalculatedDailyReportFields(employee: Employee, dailyReportInput: DailyReportInput) {
        const employeeBonus = dailyReportInput.employeeBonus ?? 0;
        const employeeTotalSalary = (employee.fixedSalary ?? 0) + employeeBonus;
        const totalRevenue = dailyReportInput.cashRevenue + dailyReportInput.terminalRevenue;
        const acquiringFee = dailyReportInput.terminalRevenue * toDecimalPercent(acquiringPercent);

        const calculatedDailyReportFields: DailyReportCalculated = {
            employeeTotalSalary: employeeTotalSalary,
            totalRevenue,
            acquiringFee: acquiringFee,
            netProfit: this.getNetProfit(
                totalRevenue,
                dailyReportInput.costOfGoods,
                dailyReportInput.productWriteOffs,
                employeeTotalSalary,
                acquiringFee,
            ),
            salaryPercent: percent(employeeTotalSalary, totalRevenue),
            costPercent: percent(dailyReportInput.costOfGoods, totalRevenue),
            writeOffPercent: percent(dailyReportInput.productWriteOffs, totalRevenue),
            cashPercent: percent(dailyReportInput.cashRevenue, totalRevenue),
            terminalPercent: percent(dailyReportInput.terminalRevenue, totalRevenue),
        };

        return calculatedDailyReportFields;
    }

    private getNetProfit(
        totalRevenue: number,
        costOfGoods: number,
        productWriteOffs: number,
        employeeTotalSalary: number,
        acquiringFee: number,
    ) {
        return totalRevenue - costOfGoods - productWriteOffs - employeeTotalSalary - acquiringFee;
    }
}
