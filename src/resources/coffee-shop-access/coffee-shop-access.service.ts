import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import {
    CoffeeShopAccess,
    CoffeeShopAccessDocument,
    coffeeShopAccessRoleKeys,
} from "./coffee-shop-access.schema";

export interface SetShopAccessItem {
    coffeeShopId: string;
    role?: string;
    permissions: string[];
}

@Injectable()
export class CoffeeShopAccessService {
    constructor(
        @InjectModel(CoffeeShopAccess.name)
        private readonly accessModel: Model<CoffeeShopAccessDocument>,
    ) {}

    findByMemberId(memberId: string) {
        return this.accessModel
            .find({ memberId: new mongoose.Types.ObjectId(memberId) })
            .populate("coffeeShopId", "name address isActive")
            .exec();
    }

    findByMemberAndShop(memberId: string, coffeeShopId: string) {
        return this.accessModel
            .findOne({
                memberId: new mongoose.Types.ObjectId(memberId),
                coffeeShopId: new mongoose.Types.ObjectId(coffeeShopId),
            })
            .exec();
    }

    findAllByMemberIds(memberIds: mongoose.Types.ObjectId[]) {
        return this.accessModel.find({ memberId: { $in: memberIds } }).exec();
    }

    async setMemberShopAccess(memberId: string, accessList: SetShopAccessItem[]) {
        const memberObjectId = new mongoose.Types.ObjectId(memberId);

        await this.accessModel.deleteMany({ memberId: memberObjectId });

        if (!accessList.length) return [];

        const documents = accessList.map((item) => ({
            memberId: memberObjectId,
            coffeeShopId: new mongoose.Types.ObjectId(item.coffeeShopId),
            role: item.role || coffeeShopAccessRoleKeys.custom,
            permissions: item.permissions || [],
        }));

        return this.accessModel.insertMany(documents);
    }

    deleteByMemberId(memberId: string) {
        return this.accessModel.deleteMany({ memberId: new mongoose.Types.ObjectId(memberId) }).exec();
    }

    deleteByCoffeeShopId(coffeeShopId: string) {
        return this.accessModel
            .deleteMany({ coffeeShopId: new mongoose.Types.ObjectId(coffeeShopId) })
            .exec();
    }
}
