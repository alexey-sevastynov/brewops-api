import { Controller, Get, Param, Query } from "@nestjs/common";
import { KavappSalesService } from "../services/kavapp-sales.service";
import { CheckPermission } from "../../../auth/decorators/check-permission.decorator";
import { resourceNames } from "../../../../common/constants/resource-names";
import { permissionActions } from "../../../../common/enums/permission-action";
import { getTodayDate } from "../../../../common/utils/date/date";

@Controller("coffee-shops/:coffeeShopId/kavapp/sales")
export class KavappSalesController {
    constructor(private readonly kavappSalesService: KavappSalesService) {}

    @Get()
    @CheckPermission(resourceNames.kavapp, permissionActions.read)
    async getDailySales(
        @Param("coffeeShopId") coffeeShopId: string,
        @Query("date") date?: string,
        @Query("pointId") pointId?: string,
    ) {
        const queryDate = date || getTodayDate();
        return this.kavappSalesService.getDailySalesRaw(coffeeShopId, queryDate, pointId);
    }

    @Get("analytics")
    @CheckPermission(resourceNames.kavapp, permissionActions.read)
    async getDailySalesAnalytics(
        @Param("coffeeShopId") coffeeShopId: string,
        @Query("date") date?: string,
        @Query("pointId") pointId?: string,
    ) {
        const queryDate = date || getTodayDate();
        return this.kavappSalesService.getDailySalesAnalytics(coffeeShopId, queryDate, pointId);
    }
}
