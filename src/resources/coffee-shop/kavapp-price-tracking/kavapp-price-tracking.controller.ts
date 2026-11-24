import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { CheckPermission } from "../../auth/decorators/check-permission.decorator";
import { resourceNames } from "../../../common/constants/resource-names";
import { permissionActions } from "../../../common/enums/permission-action";
import { KavappPriceTrackingService } from "./services/kavapp-price-tracking.service";

@Controller("coffee-shops/:coffeeShopId/kavapp/prices")
export class KavappPriceTrackingController {
    constructor(private readonly kavappPriceTrackingService: KavappPriceTrackingService) {}

    @Get()
    @CheckPermission(resourceNames.kavapp, permissionActions.read)
    getCurrentPrices(@Param("coffeeShopId") coffeeShopId: string, @Query("pointId") pointId?: string) {
        return this.kavappPriceTrackingService.getCurrentPrices(coffeeShopId, pointId);
    }

    @Post("sync")
    @CheckPermission(resourceNames.kavapp, permissionActions.write)
    sync(@Param("coffeeShopId") coffeeShopId: string, @Query("pointId") pointId?: string) {
        return this.kavappPriceTrackingService.sync(coffeeShopId, pointId);
    }

    @Get("snapshots/latest")
    @CheckPermission(resourceNames.kavapp, permissionActions.read)
    getLatestSnapshot(@Param("coffeeShopId") coffeeShopId: string) {
        return this.kavappPriceTrackingService.getLatestSnapshot(coffeeShopId);
    }

    @Get("snapshots")
    @CheckPermission(resourceNames.kavapp, permissionActions.read)
    getHistory(
        @Param("coffeeShopId") coffeeShopId: string,
        @Query("limit", new DefaultValuePipe(30), ParseIntPipe) limit: number,
    ) {
        return this.kavappPriceTrackingService.getHistory(coffeeShopId, limit);
    }
}
