import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { TelegramNotify } from "../../../infra/telegram/telegram.decorator";
import { telegramActions } from "../../../infra/telegram/constants";
import { DailyReportService } from "./daily-report.service";
import { CreateDailyReportDto } from "./dto/create-daily-report-dto";
import { UpdateDailyReportDto } from "./dto/update-daily-report-dto";
import { formatDailyReportMessage } from "./daily-report-telegram";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";
import { resourceNames } from "../../../common/constants/resource-names";
import { permissionActions } from "../../../common/enums/permission-action";

@Controller("coffee-shops/:coffeeShopId/daily-reports")
export class DailyReportController {
    constructor(private readonly service: DailyReportService) {}

    @Get()
    @CheckPermission(resourceNames.dailyReports, permissionActions.read)
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllDailyReport(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission(resourceNames.dailyReports, permissionActions.read)
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdDailyReport(id, coffeeShopId);
    }

    @Post()
    @CheckPermission(resourceNames.dailyReports, permissionActions.write)
    @UsePipes(new ValidationPipe())
    @TelegramNotify({
        resource: "DailyReport",
        action: telegramActions.create,
        messageFactory: formatDailyReportMessage,
    })
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateDailyReportDto) {
        return this.service.createDailyReport(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission(resourceNames.dailyReports, permissionActions.write)
    @UsePipes(new ValidationPipe())
    @TelegramNotify({
        resource: "DailyReport",
        action: telegramActions.update,
        messageFactory: formatDailyReportMessage,
    })
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateDailyReportDto,
    ) {
        return this.service.updateDailyReport(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission(resourceNames.dailyReports, permissionActions.delete)
    @TelegramNotify({
        resource: "DailyReport",
        action: telegramActions.delete,
    })
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.deleteDailyReport(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission(resourceNames.dailyReports, permissionActions.delete)
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.deleteAllDailyReports(coffeeShopId);
    }
}
