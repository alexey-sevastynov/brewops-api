import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { TelegramService } from "../../../../infra/telegram/telegram.service";
import { KavappInventoryItem } from "../../../../integrations/kavapp/types/inventory/kavapp-inventory-item";
import { KavappInventoryResponse } from "../../../../integrations/kavapp/types/inventory/kavapp-inventory-response";
import { kavappInventoryTypes } from "../../../../integrations/kavapp/constants/kavapp-inventory-types";
import { isNumber, isString } from "../../../../common/utils/guards";
import { formatNumber } from "../../../../common/utils/number";
import { KavappInventory } from "../kavapp-inventory-schema";
import { InventoryAlertRuleDocument } from "../inventory-alert-rule-schema";
import { InventoryAlertRuleService } from "./inventory-alert-rule.service";
import { inventoryAlertIgnoreNames } from "../constants/inventory-alert-rules";
import { InventoryAlertState, inventoryAlertStates } from "../constants/alert-states";
import { CoffeeShop, CoffeeShopDocument } from "../../coffee-shop-schema";

interface InventoryAlert {
    inventoryItem: KavappInventoryItem;
    inventoryAlertRule?: InventoryAlertRuleDocument;
}

@Injectable()
export class InventoryAlertService {
    constructor(
        private readonly telegramService: TelegramService,
        private readonly ruleService: InventoryAlertRuleService,
        @InjectModel(CoffeeShop.name) private readonly coffeeShopModel: Model<CoffeeShopDocument>,
    ) {}

    async checkAndNotify(
        coffeeShopId: string,
        inventory: KavappInventoryResponse,
        previousSnapshot: KavappInventory | null,
        forceTest = false,
    ) {
        const inventoryAlertRules = await this.ruleService.getInventoryAlertRules(coffeeShopId);
        const rulesByKey = new Map(
            inventoryAlertRules.map((rule) => [this.ruleKey(rule.itemType, rule.kavappItemId), rule]),
        );
        const rulesByName = new Map(inventoryAlertRules.map((rule) => [this.normalizeName(rule.name), rule]));
        const currentItems = this.getAllInventoryItems(inventory);
        const previousItems = previousSnapshot ? this.getAllInventoryItems(previousSnapshot) : [];
        const previousStates = new Map<string, InventoryAlertState>();

        for (const item of previousItems) {
            const inventoryAlertRule = this.findInventoryAlertRule(item, rulesByKey, rulesByName);

            if (!inventoryAlertRule) continue;

            if (this.isRuleChangedAfterSnapshot(inventoryAlertRule, previousSnapshot)) continue;

            previousStates.set(
                this.itemKey(item),
                this.getState(this.toQuantity(item.itemcount), inventoryAlertRule),
            );
        }

        const negativeAlerts: InventoryAlert[] = [];
        const lowStockAlerts: InventoryAlert[] = [];

        let hasNewAlert = forceTest;

        for (const item of currentItems) {
            const inventoryAlertRule = this.findInventoryAlertRule(item, rulesByKey, rulesByName);
            const currentInventoryAlertState: InventoryAlertState = this.getState(
                this.toQuantity(item.itemcount),
                inventoryAlertRule,
            );

            if (this.isNegativeInventoryAlert(item, currentInventoryAlertState)) {
                negativeAlerts.push({ inventoryItem: item, inventoryAlertRule: inventoryAlertRule });
                hasNewAlert = true;
            }

            if (!inventoryAlertRule) continue;

            const previousInventoryAlertState =
                previousStates.get(this.itemKey(item)) ?? inventoryAlertStates.none;

            if (currentInventoryAlertState === inventoryAlertStates.lowStock)
                lowStockAlerts.push({ inventoryItem: item, inventoryAlertRule: inventoryAlertRule });

            if (
                !forceTest &&
                this.shouldNotifyAlert(previousInventoryAlertState, currentInventoryAlertState)
            ) {
                hasNewAlert = true;
            }
        }

        if (!forceTest && !hasNewAlert) return;

        const message =
            negativeAlerts.length || lowStockAlerts.length
                ? this.formatAlertMessage(negativeAlerts, lowStockAlerts, forceTest)
                : this.formatEmptyMessage(forceTest);

        const shop = await this.coffeeShopModel.findById(coffeeShopId).exec();
        const chatId = shop?.telegramChatId;

        if (!chatId) {
            throw new BadRequestException("Telegram чат не налаштований для цієї кав'ярні.");
        }

        await this.telegramService.sendMessage(chatId, message);
    }

    private isNegativeInventoryAlert(
        inventoryItem: KavappInventoryItem,
        inventoryAlertState: InventoryAlertState,
    ) {
        return (
            inventoryAlertState === inventoryAlertStates.negative &&
            !inventoryAlertIgnoreNames.has(inventoryItem.name)
        );
    }

    private shouldNotifyAlert(previousState: InventoryAlertState, currentState: InventoryAlertState) {
        return (
            (previousState === inventoryAlertStates.none && currentState !== inventoryAlertStates.none) ||
            (previousState === inventoryAlertStates.lowStock &&
                currentState === inventoryAlertStates.negative)
        );
    }

    private isRuleChangedAfterSnapshot(rule: InventoryAlertRuleDocument, snapshot: KavappInventory | null) {
        if (!snapshot) return false;

        const ruleChangedAt = Math.max(rule.createdAt?.getTime?.() ?? 0, rule.updatedAt?.getTime?.() ?? 0);

        return ruleChangedAt > snapshot.syncDate.getTime();
    }

    private getAllInventoryItems(inventory: KavappInventoryResponse | KavappInventory) {
        const kavappInventoryItems: KavappInventoryItem[] = [
            ...this.addInventoryItemType(inventory.cup, kavappInventoryTypes.cup),
            ...this.addInventoryItemType(inventory.ingredient, kavappInventoryTypes.ingredient),
            ...this.addInventoryItemType(inventory.product, kavappInventoryTypes.product),
            ...this.addInventoryItemType(inventory.kitchen, kavappInventoryTypes.kitchen),
        ];

        return kavappInventoryItems;
    }

    private addInventoryItemType<T extends KavappInventoryItem>(
        items: T[],
        type: KavappInventoryItem["type"],
    ) {
        const kavappInventoryItems: KavappInventoryItem[] = items.map((item) => ({
            ...item,
            type,
        }));

        return kavappInventoryItems;
    }

    private findInventoryAlertRule(
        item: KavappInventoryItem,
        byKey: Map<string, InventoryAlertRuleDocument>,
        byName: Map<string, InventoryAlertRuleDocument>,
    ): InventoryAlertRuleDocument | undefined {
        const type = item.type as InventoryAlertRuleDocument["itemType"];
        const ids = [item.itemid, item.id].filter((id): id is string => Boolean(id));

        for (const id of ids) {
            const rule = byKey.get(this.ruleKey(type, id));

            if (rule) return rule;
        }

        return byName.get(this.normalizeName(item.name));
    }

    private normalizeName(value: unknown): string {
        return this.toText(value).normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("uk-UA");
    }

    private toQuantity(value: unknown): number {
        if (isNumber(value)) return value;

        const quantity = Number(this.toText(value).trim().replace(/[−–—]/g, "-").replace(",", "."));

        return Number.isFinite(quantity) ? quantity : 0;
    }

    private toText(value: unknown): string {
        return isString(value) || isString(value) ? String(value) : "";
    }

    private getState(quantity: number, inventoryAlertRule?: InventoryAlertRuleDocument) {
        if (quantity < 0) return inventoryAlertStates.negative;

        return inventoryAlertRule && quantity <= inventoryAlertRule.threshold
            ? inventoryAlertStates.lowStock
            : inventoryAlertStates.none;
    }

    private itemKey(item: KavappInventoryItem): string {
        return `${item.type}:${item.itemid ?? item.id ?? item.name}`;
    }
    private ruleKey(type: string, id: string): string {
        return `${type}:${id}`;
    }

    private getItemUnit(item: KavappInventoryItem, rule?: InventoryAlertRuleDocument): string {
        return (
            item.unitsName ??
            (item.units === "1" ? "шт." : item.units === "2" ? "г" : item.units || rule?.unit || "")
        );
    }

    private formatAlertMessage(
        negativeInventoryAlerts: InventoryAlert[],
        lowStockInventoryAlerts: InventoryAlert[],
        test: boolean,
    ) {
        let message = `📦 *Контроль залишків${test ? " (ТЕСТ)" : ""}*\n`;

        if (negativeInventoryAlerts.length) {
            message += "\n🚨 *Від’ємні залишки*\n\n";

            for (const negativeInventoryAlert of negativeInventoryAlerts) {
                message += `• ${negativeInventoryAlert.inventoryItem.name} — ${formatNumber(negativeInventoryAlert.inventoryItem.itemcount)} ${this.getItemUnit(negativeInventoryAlert.inventoryItem, negativeInventoryAlert.inventoryAlertRule)}\n`;
            }
        }

        if (lowStockInventoryAlerts.length) {
            message += "\n⚠️ *Потрібно поповнити*\n\n";

            for (const lowStockInventoryAlert of lowStockInventoryAlerts) {
                message += `• ${lowStockInventoryAlert.inventoryItem.name} — ${formatNumber(lowStockInventoryAlert.inventoryItem.itemcount)} ${this.getItemUnit(lowStockInventoryAlert.inventoryItem, lowStockInventoryAlert.inventoryAlertRule)}\n`;

                if (lowStockInventoryAlert.inventoryAlertRule?.description)
                    message += `  ${lowStockInventoryAlert.inventoryAlertRule?.description}\n`;
            }
        }
        return message.trim();
    }

    private formatEmptyMessage(test: boolean): string {
        return `📦 *Контроль залишків${test ? " (ТЕСТ)" : ""}*\n\n✅ Усі залишки в нормі.`;
    }
}
