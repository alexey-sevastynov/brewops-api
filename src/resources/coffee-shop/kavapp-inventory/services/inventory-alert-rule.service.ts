import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { KavappClient } from "../../../../integrations/kavapp/clients/kavapp.client";
import { CreateInventoryAlertRuleDto } from "../dto/create-inventory-alert-rule.dto";
import { UpdateInventoryAlertRuleDto } from "../dto/update-inventory-alert-rule.dto";
import { InventoryAlertRule, InventoryAlertRuleDocument } from "../inventory-alert-rule-schema";
import { errorMessages } from "../../../../common/constants/error-messages";
import { CoffeeShop, CoffeeShopDocument } from "../../coffee-shop-schema";

@Injectable()
export class InventoryAlertRuleService {
    constructor(
        @InjectModel(InventoryAlertRule.name) private readonly model: Model<InventoryAlertRuleDocument>,
        private readonly kavappClient: KavappClient,
        @InjectModel(CoffeeShop.name) private readonly coffeeShopModel: Model<CoffeeShopDocument>,
    ) {}

    async findAllInventoryAlertRules(coffeeShopId: string) {
        return this.model.find({ coffeeShopId }).sort({ itemType: 1, name: 1 }).exec();
    }

    findByIdInventoryAlertRule(id: string, coffeeShopId: string) {
        return this.model.findOne({ _id: id, coffeeShopId }).exec();
    }

    async createInventoryAlertRule(dto: CreateInventoryAlertRuleDto, coffeeShopId: string) {
        const existingRule = await this.model.exists({
            coffeeShopId,
            itemType: dto.itemType,
            kavappItemId: dto.kavappItemId,
        });

        if (existingRule) {
            throw new ConflictException(errorMessages.mustBeUnique.replace("{0}", "Inventory alert rule"));
        }

        const shop = await this.coffeeShopModel.findById(coffeeShopId).exec();
        const email = shop?.kavappEmail;
        const pass = shop?.kavappPassword;

        const catalog = await this.kavappClient.getCatalog(coffeeShopId, email, pass);
        const catalogItem = catalog.find(
            (item) => item.type === dto.itemType && item.id === dto.kavappItemId,
        );

        return this.model.create({
            ...dto,
            coffeeShopId,
            name: dto.name ?? catalogItem?.name ?? dto.kavappItemId,
            unit: dto.unit ?? catalogItem?.unitsName ?? catalogItem?.units ?? "",
        });
    }

    async updateInventoryAlertRule(id: string, dto: UpdateInventoryAlertRuleDto, coffeeShopId: string) {
        const rule = await this.model
            .findOneAndUpdate({ _id: id, coffeeShopId }, { $set: dto }, { new: true, runValidators: true })
            .exec();

        if (!rule) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", "Inventory alert rule"));
        }

        return rule;
    }

    async removeInventoryAlertRule(id: string, coffeeShopId: string) {
        const deleted = await this.model.findOneAndDelete({ _id: id, coffeeShopId }).exec();

        if (!deleted) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", "Inventory alert rule"));
        }

        return { success: true };
    }

    async removeAllInventoryAlertRules(coffeeShopId: string) {
        const result = await this.model.deleteMany({ coffeeShopId }).exec();

        return { deletedCount: result.deletedCount };
    }

    async getInventoryAlertRules(coffeeShopId: string): Promise<InventoryAlertRuleDocument[]> {
        return this.model.find({ coffeeShopId }).exec();
    }
}
