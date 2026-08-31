import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { ExpenseReportService } from "./expense-report.service";
import { CreateExpenseReportDto } from "./dto/create-expense-report-dto";
import { UpdateExpenseReportDto } from "./dto/update-expense-report-dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";

@Controller("coffee-shops/:coffeeShopId/expense-reports")
export class ExpenseReportController {
    constructor(private readonly service: ExpenseReportService) {}

    @Get()
    @CheckPermission("expense-reports", "read")
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllExpenseReport(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission("expense-reports", "read")
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdExpenseReport(id, coffeeShopId);
    }

    @Post()
    @CheckPermission("expense-reports", "write")
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateExpenseReportDto) {
        return this.service.createExpenseReport(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission("expense-reports", "write")
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateExpenseReportDto,
    ) {
        return this.service.updateExpenseReport(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission("expense-reports", "delete")
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.deleteExpenseReport(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission("expense-reports", "delete")
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.deleteAllExpenseReports(coffeeShopId);
    }
}
