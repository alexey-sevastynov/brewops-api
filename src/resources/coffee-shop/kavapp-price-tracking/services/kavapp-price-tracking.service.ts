import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { KavappPriceClient } from "../../../../integrations/kavapp/clients/kavapp-price.client";
import {
    KavappPriceItem,
    KavappPriceResponse,
} from "../../../../integrations/kavapp/types/inventory/kavapp-price-item";
import {
    kavappInventoryItemTypes,
    kavappInventoryLabels,
} from "../../../../integrations/kavapp/constants/kavapp-inventory";
import { decrypt, isEncrypted } from "../../../../common/utils/crypto";
import { TelegramService } from "../../../../infra/telegram/telegram.service";
import { CoffeeShop } from "../../coffee-shop-schema";
import { KavappPriceSnapshot, KavappPriceSnapshotDocument } from "../kavapp-price-snapshot.schema";

const decryptPassword = (raw?: string | null): string | undefined => {
    if (!raw) return undefined;

    return isEncrypted(raw) ? decrypt(raw) : raw;
};

type PriceCategory = (typeof kavappInventoryItemTypes)[number];

@Injectable()
export class KavappPriceTrackingService {
    constructor(
        private readonly kavappPriceClient: KavappPriceClient,
        private readonly telegramService: TelegramService,
        @InjectModel(CoffeeShop.name) private readonly coffeeShopModel: Model<CoffeeShop>,
        @InjectModel(KavappPriceSnapshot.name)
        private readonly snapshotModel: Model<KavappPriceSnapshotDocument>,
    ) {}

    async getCurrentPrices(coffeeShopId: string, pointId?: string): Promise<KavappPriceResponse> {
        const shop = await this.coffeeShopModel.findById(coffeeShopId).exec();

        return this.kavappPriceClient.getPrices(
            coffeeShopId,
            shop?.kavappEmail,
            decryptPassword(shop?.kavappPassword),
            pointId || shop?.kavappPointId,
        );
    }

    async sync(coffeeShopId: string, pointId?: string) {
        const prices = await this.getCurrentPrices(coffeeShopId, pointId);
        const previousSnapshot = await this.snapshotModel
            .findOne({ coffeeShopId })
            .sort({ syncDate: -1 })
            .exec();
        const changedPrices = previousSnapshot ? this.findChangedPrices(previousSnapshot.prices, prices) : [];
        const snapshot = await this.snapshotModel.create({ coffeeShopId, syncDate: new Date(), prices });

        if (changedPrices.length) {
            const shop = await this.coffeeShopModel.findById(coffeeShopId).exec();

            if (shop?.telegramChatId) {
                await this.telegramService.sendMessage(
                    shop.telegramChatId,
                    this.formatChangeMessage(changedPrices),
                );
            }
        }

        return { snapshot, changedCount: changedPrices.length };
    }

    getLatestSnapshot(coffeeShopId: string) {
        return this.snapshotModel.findOne({ coffeeShopId }).sort({ syncDate: -1 }).exec();
    }

    async getHistory(coffeeShopId: string, limit = 30) {
        return this.snapshotModel.find({ coffeeShopId }).sort({ syncDate: -1 }).limit(limit).exec();
    }

    private findChangedPrices(previous: KavappPriceResponse, current: KavappPriceResponse) {
        const changedPrices: Array<{
            category: PriceCategory;
            previous: KavappPriceItem;
            current: KavappPriceItem;
        }> = [];

        for (const category of kavappInventoryItemTypes) {
            const previousItems = new Map((previous?.[category] ?? []).map((item) => [item.itemid, item]));

            for (const currentItem of current[category] ?? []) {
                const previousItem = previousItems.get(currentItem.itemid);

                if (previousItem && previousItem.packPrice !== currentItem.packPrice) {
                    changedPrices.push({ category, previous: previousItem, current: currentItem });
                }
            }
        }
        return changedPrices;
    }

    private formatChangeMessage(
        changes: Array<{ category: PriceCategory; previous: KavappPriceItem; current: KavappPriceItem }>,
    ) {
        const lines = changes.map(({ category, previous, current }) => {
            const difference = current.packPrice - previous.packPrice;
            const direction = difference > 0 ? "⬆️ Ціна зросла" : "⬇️ Ціна знизилася";
            const packDescription = current.pack ? ` (${current.pack} ${current.unitsName || "од."})` : "";

            return `${direction}: ${current.name}${packDescription}\n${previous.packPrice.toFixed(2)} → ${current.packPrice.toFixed(2)} грн за упаковку (${difference > 0 ? "+" : ""}${difference.toFixed(2)} грн) · ${kavappInventoryLabels[category]}`;
        });

        return `📊 Зміни собівартості на торговій точці\n\n${lines.join("\n\n")}`;
    }
}
