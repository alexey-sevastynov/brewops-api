import { Injectable } from "@nestjs/common";

import { KavappAuthClient } from "./kavapp-auth.client";
import { KavappInventoryClient } from "./kavapp-inventory.client";
import { KavappSalesClient } from "./kavapp-sales.client";

import { KavappInventoryResponse } from "../types/inventory/kavapp-inventory-response";

@Injectable()
export class KavappClient {
    constructor(
        private readonly authClient: KavappAuthClient,
        private readonly inventoryClient: KavappInventoryClient,
        private readonly salesClient: KavappSalesClient,
    ) {}

    login(coffeeShopId: string, email?: string, password?: string) {
        return this.authClient.login(coffeeShopId, email, password);
    }

    getInventory(
        coffeeShopId: string,
        email?: string,
        password?: string,
        pointId?: string,
    ): Promise<KavappInventoryResponse> {
        return this.inventoryClient.getInventory(coffeeShopId, email, password, pointId);
    }

    getCatalog(coffeeShopId: string, email?: string, password?: string) {
        return this.inventoryClient.getCatalog(coffeeShopId, email, password);
    }

    getDailySalesRaw(
        coffeeShopId: string,
        sdtime: string,
        edtime: string,
        email?: string,
        password?: string,
        pointId?: string,
    ) {
        return this.salesClient.getDailySalesRaw(coffeeShopId, sdtime, edtime, email, password, pointId);
    }
}
