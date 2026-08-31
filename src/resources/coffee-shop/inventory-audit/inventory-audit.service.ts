import { Model } from "mongoose";
import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CreateInventoryAuditDto } from "./dto/create-inventory-audit-dto";
import { UpdateInventoryAuditDto } from "./dto/update-inventory-audit-dto";
import { InventoryAudit, InventoryAuditDocument } from "./inventory-audit-schema";

@Injectable()
export class InventoryAuditService {
    constructor(
        @InjectModel(InventoryAudit.name)
        private readonly model: Model<InventoryAuditDocument>,
    ) {}

    findAllInventoryAudit(coffeeShopId: string) {
        return this.model.find({ coffeeShopId }).sort({ createdAt: -1 });
    }

    async findByIdInventoryAudit(id: string, coffeeShopId: string) {
        const audit = await this.model.findOne({ _id: id, coffeeShopId });

        if (!audit) {
            throw new NotFoundException("InventoryAudit not found");
        }

        return audit;
    }

    async createInventoryAudit(dto: CreateInventoryAuditDto, coffeeShopId: string) {
        const data = this.normalize(dto);

        const created = await this.model.create({
            ...data,
            coffeeShopId,
        });

        return created;
    }

    async updateInventoryAudit(id: string, dto: UpdateInventoryAuditDto, coffeeShopId: string) {
        const audit = await this.model.findOne({ _id: id, coffeeShopId });

        if (!audit) {
            throw new NotFoundException("InventoryAudit not found");
        }

        const updatedData = this.normalize({
            ...audit.toObject({ virtuals: false }),
            ...dto,
        });

        Object.assign(audit, updatedData);

        return audit.save();
    }

    async deleteInventoryAudit(id: string, coffeeShopId: string) {
        const deleted = await this.model.findOneAndDelete({ _id: id, coffeeShopId });

        if (!deleted) {
            throw new NotFoundException("InventoryAudit not found");
        }

        return { success: true };
    }

    async deleteAllInventoryAudits(coffeeShopId: string) {
        const result = await this.model.deleteMany({ coffeeShopId });
        return { deletedCount: result.deletedCount };
    }

    private normalize(dto: Partial<CreateInventoryAuditDto>) {
        const validFrom = this.toDate(dto.validFrom);
        const validTo = this.toDate(dto.validTo);

        if (validFrom && validTo && validFrom > validTo) {
            throw new BadRequestException("validFrom cannot be later than validTo");
        }

        return {
            ...dto,
            validFrom,
            validTo,
        };
    }

    private toDate(date?: string | Date) {
        if (!date) return undefined;

        const d = new Date(date);

        if (isNaN(d.getTime())) {
            throw new BadRequestException("Invalid date format");
        }

        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }
}
