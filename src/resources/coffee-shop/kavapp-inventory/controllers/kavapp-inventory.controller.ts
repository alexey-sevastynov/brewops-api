import { Controller, Get, Post, Query, Param, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { KavappInventoryResponse } from "../../../../integrations/kavapp/types/inventory/kavapp-inventory-response";
import { KavappInventoryService } from "../services/kavapp-inventory.service";
import { KavappSyncService } from "../services/kavapp-sync.service";
import { KavappCatalogItem } from "../../../../integrations/kavapp/types/inventory/kavapp-inventory-item";
import { CheckPermission } from "../../../../resources/auth/decorators/check-permission.decorator";

@Controller("coffee-shops/:coffeeShopId/kavapp")
export class KavappInventoryController {
    constructor(
        private readonly kavappInventoryService: KavappInventoryService,
        private readonly kavappSyncService: KavappSyncService,
    ) {}

    @Get("inventory")
    @CheckPermission("kavapp", "read")
    async getInventory(
        @Param("coffeeShopId") coffeeShopId: string,
        @Query("pointId") pointId?: string,
    ): Promise<KavappInventoryResponse> {
        return this.kavappInventoryService.getCurrentInventory(coffeeShopId, pointId);
    }

    @Get("catalog")
    @CheckPermission("kavapp", "read")
    async getCatalog(@Param("coffeeShopId") coffeeShopId: string): Promise<KavappCatalogItem[]> {
        return this.kavappInventoryService.getCatalog(coffeeShopId);
    }

    @Post("sync")
    @CheckPermission("kavapp", "write")
    async sync(
        @Param("coffeeShopId") coffeeShopId: string,
        @Query("pointId") pointId?: string,
        @Query("testAlert") testAlert?: string,
    ) {
        const isTest = testAlert === "true";
        return this.kavappSyncService.sync(coffeeShopId, pointId, isTest);
    }

    @Get("snapshots/latest")
    @CheckPermission("kavapp", "read")
    async getLatestSnapshot(@Param("coffeeShopId") coffeeShopId: string) {
        return this.kavappSyncService.getLatestSnapshot(coffeeShopId);
    }

    @Get("snapshots")
    @CheckPermission("kavapp", "read")
    async getSnapshots(
        @Param("coffeeShopId") coffeeShopId: string,
        @Query("limit", new DefaultValuePipe(30), ParseIntPipe) limit: number,
    ) {
        return this.kavappSyncService.getHistory(coffeeShopId, limit);
    }
}
