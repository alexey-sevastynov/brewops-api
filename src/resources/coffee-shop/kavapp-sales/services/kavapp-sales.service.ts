import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { KavappClient } from "../../../../integrations/kavapp/clients/kavapp.client";
import { KavappSalesMapper } from "../../../../integrations/kavapp/mappers/kavapp-sales.mapper";
import { KavappDailySalesAnalytics } from "../../../../integrations/kavapp/types/sales/kavapp-sales-analytics.types";
import { KavappDailySalesRaw } from "../../../../integrations/kavapp/types/sales/kavapp-sales-raw.types";
import { CoffeeShop } from "../../coffee-shop-schema";
import { decrypt, isEncrypted } from "../../../../common/utils/crypto";
import { formatDateToIsoDate } from "../../../../common/utils/date/date";

const decryptPassword = (raw?: string | null): string | undefined => {
    if (!raw) return undefined;

    return isEncrypted(raw) ? decrypt(raw) : raw;
};

@Injectable()
export class KavappSalesService {
    private readonly logger = new Logger(KavappSalesService.name);

    constructor(
        private readonly kavappClient: KavappClient,
        @InjectModel(CoffeeShop.name) private readonly coffeeShopModel: Model<CoffeeShop>,
    ) {}

    async getDailySalesRaw(
        coffeeShopId: string,
        date: string | Date,
        pointId?: string,
    ): Promise<KavappDailySalesRaw | null> {
        const credentials = await this.resolveShopCredentials(coffeeShopId, pointId);
        if (!credentials) return null;

        const dateStr = this.normalizeDateString(date);

        try {
            return await this.kavappClient.getDailySalesRaw(
                coffeeShopId,
                dateStr,
                dateStr,
                credentials.email,
                credentials.pass,
                credentials.pointId,
            );
        } catch (error) {
            this.logger.warn(
                `Failed to fetch raw sales from Kavapp for shop ${coffeeShopId}: ${(error as Error).message}`,
            );
            return null;
        }
    }

    async getDailySalesAnalytics(
        coffeeShopId: string,
        date: string | Date,
        pointId?: string,
    ): Promise<KavappDailySalesAnalytics | null> {
        const raw = await this.getDailySalesRaw(coffeeShopId, date, pointId);

        if (!raw) return null;

        return KavappSalesMapper.analyze(raw);
    }

    private async resolveShopCredentials(
        coffeeShopId: string,
        pointId?: string,
    ): Promise<{ email: string; pass: string; pointId: string } | null> {
        const shop = await this.coffeeShopModel.findById(coffeeShopId).exec();
        if (!shop || !shop.kavappEmail || !shop.kavappPassword || !shop.kavappPointId) {
            this.logger.debug(`No Kavapp credentials configured for coffee shop ${coffeeShopId}`);
            return null;
        }

        const pass = decryptPassword(shop.kavappPassword);
        if (!pass) return null;

        const activePointId = pointId || shop.kavappPointId;

        return {
            email: shop.kavappEmail,
            pass,
            pointId: activePointId,
        };
    }

    private normalizeDateString(date: string | Date): string {
        if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
            return date.trim();
        }

        const formatted = formatDateToIsoDate(date);
        return formatted || new Date().toISOString().slice(0, 10);
    }
}
