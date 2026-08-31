import { Model } from "mongoose";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CreateOwnerWithdrawalDto } from "./dto/create-owner-withdrawal-dto";
import { UpdateOwnerWithdrawalDto } from "./dto/update-owner-withdrawal-dto";
import { OwnerWithdrawal, OwnerWithdrawalDocument } from "./owner-withdrawal-schema";

@Injectable()
export class OwnerWithdrawalService {
    constructor(
        @InjectModel(OwnerWithdrawal.name)
        private readonly model: Model<OwnerWithdrawalDocument>,
    ) {}

    findAllOwnerWithdrawal(coffeeShopId: string) {
        return this.model.find({ coffeeShopId }).sort({ withdrawalDate: -1, createdAt: -1 });
    }

    async findByIdOwnerWithdrawal(id: string, coffeeShopId: string) {
        const withdrawal = await this.model.findOne({ _id: id, coffeeShopId });

        if (!withdrawal) {
            throw new NotFoundException("OwnerWithdrawal not found");
        }

        return withdrawal;
    }

    createOwnerWithdrawal(dto: CreateOwnerWithdrawalDto, coffeeShopId: string) {
        return this.model.create({
            ...dto,
            coffeeShopId,
        });
    }

    async updateOwnerWithdrawal(id: string, dto: UpdateOwnerWithdrawalDto, coffeeShopId: string) {
        const withdrawal = await this.model.findOneAndUpdate({ _id: id, coffeeShopId }, dto, { new: true });

        if (!withdrawal) {
            throw new NotFoundException("OwnerWithdrawal not found");
        }

        return withdrawal;
    }

    async deleteOwnerWithdrawal(id: string, coffeeShopId: string) {
        const deleted = await this.model.findOneAndDelete({ _id: id, coffeeShopId });

        if (!deleted) {
            throw new NotFoundException("OwnerWithdrawal not found");
        }

        return { success: true };
    }

    async deleteAllOwnerWithdrawals(coffeeShopId: string) {
        const result = await this.model.deleteMany({ coffeeShopId });
        return { deletedCount: result.deletedCount };
    }
}
