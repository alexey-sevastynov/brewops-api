import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { KavappClient } from "../../../../integrations/kavapp/clients/kavapp.client";
import { CreateInventoryAlertRuleDto } from "../dto/create-inventory-alert-rule.dto";
import { UpdateInventoryAlertRuleDto } from "../dto/update-inventory-alert-rule.dto";
import { InventoryAlertRule, InventoryAlertRuleDocument } from "../inventory-alert-rule-schema";
import { errorMessages } from "../../../../common/constants/error-messages";

@Injectable()
export class InventoryAlertRuleService {
    constructor(
        @InjectModel(InventoryAlertRule.name) private readonly model: Model<InventoryAlertRuleDocument>,
        private readonly kavappClient: KavappClient,
    ) {}

    async findAllInventoryAlertRules() {
        return this.model.find().sort({ itemType: 1, name: 1 }).exec();
    }

    findByIdInventoryAlertRule(id: string) {
        return this.model.findById(id).exec();
    }

    async createInventoryAlertRule(dto: CreateInventoryAlertRuleDto) {
        const existingRule = await this.model.exists({
            itemType: dto.itemType,
            kavappItemId: dto.kavappItemId,
        });

        if (existingRule) {
            throw new ConflictException(errorMessages.mustBeUnique.replace("{0}", "Inventory alert rule"));
        }

        const catalogItem = (await this.kavappClient.getCatalog()).find(
            (item) => item.type === dto.itemType && item.id === dto.kavappItemId,
        );

        return this.model.create({
            ...dto,
            name: dto.name ?? catalogItem?.name ?? dto.kavappItemId,
            unit: dto.unit ?? catalogItem?.unitsName ?? catalogItem?.units ?? "",
        });
    }

    async updateInventoryAlertRule(id: string, dto: UpdateInventoryAlertRuleDto) {
        const rule = await this.model
            .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
            .exec();

        if (!rule) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", "Inventory alert rule"));
        }

        return rule;
    }

    async removeInventoryAlertRule(id: string) {
        const deleted = await this.model.findByIdAndDelete(id).exec();

        if (!deleted) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", "Inventory alert rule"));
        }

        return { success: true };
    }

    async removeAllInventoryAlertRules() {
        const result = await this.model.deleteMany().exec();

        return { deletedCount: result.deletedCount };
    }

    async getInventoryAlertRules(): Promise<InventoryAlertRuleDocument[]> {
        return this.model.find().exec();
    }
}
