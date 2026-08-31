import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { KavappClient } from "../../../../integrations/kavapp/clients/kavapp.client";
import { KavappInventoryMapper } from "../../../../integrations/kavapp/mappers/kavapp-inventory.mapper";
import { KavappCatalogItem } from "../../../../integrations/kavapp/types/inventory/kavapp-inventory-item";
import { KavappInventoryResponse } from "../../../../integrations/kavapp/types/inventory/kavapp-inventory-response";
import { CoffeeShop, CoffeeShopDocument } from "../../coffee-shop-schema";
import { decrypt, isEncrypted } from "../../../../common/utils/crypto";

const decryptPassword = (raw?: string | null): string | undefined => {
    if (!raw) return undefined;
    return isEncrypted(raw) ? decrypt(raw) : raw;
};

@Injectable()
export class KavappInventoryService {
    constructor(
        private readonly kavappClient: KavappClient,
        @InjectModel(CoffeeShop.name) private readonly coffeeShopModel: Model<CoffeeShopDocument>,
    ) {}

    async getCurrentInventory(coffeeShopId: string, pointId?: string): Promise<KavappInventoryResponse> {
        const shop = await this.coffeeShopModel.findById(coffeeShopId).exec();
        const email = shop?.kavappEmail;
        const pass = decryptPassword(shop?.kavappPassword);
        const activePointId = pointId || shop?.kavappPointId;

        const response = await this.kavappClient.getInventory(coffeeShopId, email, pass, activePointId);

        return KavappInventoryMapper.map(response);
    }

    async getCatalog(coffeeShopId: string): Promise<KavappCatalogItem[]> {
        const shop = await this.coffeeShopModel.findById(coffeeShopId).exec();
        const email = shop?.kavappEmail;
        const pass = decryptPassword(shop?.kavappPassword);

        return this.kavappClient.getCatalog(coffeeShopId, email, pass);
    }
}
