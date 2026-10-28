import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { TelegramNotify } from "../../../infra/telegram/telegram.decorator";
import { telegramActions } from "../../../infra/telegram/constants";
import { ExpenseReportService } from "./expense-report.service";
import { CreateExpenseReportDto } from "./dto/create-expense-report-dto";
import { UpdateExpenseReportDto } from "./dto/update-expense-report-dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";
import { resourceNames } from "../../../common/constants/resource-names";
import { permissionActions } from "../../../common/enums/permission-action";
import { formatExpenseReportMessage } from "./expense-report-telegram";

@Controller("coffee-shops/:coffeeShopId/expense-reports")
export class ExpenseReportController {
    constructor(private readonly service: ExpenseReportService) {}

    @Get()
    @CheckPermission(resourceNames.expenseReports, permissionActions.read)
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllExpenseReport(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission(resourceNames.expenseReports, permissionActions.read)
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdExpenseReport(id, coffeeShopId);
    }

    @Post()
    @CheckPermission(resourceNames.expenseReports, permissionActions.write)
    @UsePipes(new ValidationPipe())
    @TelegramNotify({
        resource: "ExpenseReport",
        action: telegramActions.create,
        messageFactory: formatExpenseReportMessage,
    })
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateExpenseReportDto) {
        return this.service.createExpenseReport(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission(resourceNames.expenseReports, permissionActions.write)
    @UsePipes(new ValidationPipe())
    @TelegramNotify({
        resource: "ExpenseReport",
        action: telegramActions.update,
        messageFactory: formatExpenseReportMessage,
    })
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateExpenseReportDto,
    ) {
        return this.service.updateExpenseReport(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission(resourceNames.expenseReports, permissionActions.delete)
    @TelegramNotify({
        resource: "ExpenseReport",
        action: telegramActions.delete,
    })
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.deleteExpenseReport(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission(resourceNames.expenseReports, permissionActions.delete)
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.deleteAllExpenseReports(coffeeShopId);
    }
}
