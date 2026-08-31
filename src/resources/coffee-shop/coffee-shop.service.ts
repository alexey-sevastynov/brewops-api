import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { CoffeeShop, CoffeeShopDocument } from "./coffee-shop-schema";
import { CreateCoffeeShopDto } from "./dto/create-coffee-shop-dto";
import { UpdateCoffeeShopDto } from "./dto/update-coffee-shop-dto";
import { errorMessages } from "../../common/constants/error-messages";
import { WorkspaceService } from "../workspace/workspace.service";
import { WorkspaceMemberService } from "../workspace-member/workspace-member.service";
import { getWorkspacePlanLimits } from "../../common/config/workspace-plan.config";
import { encrypt } from "../../common/utils/crypto";

@Injectable()
export class CoffeeShopService {
    constructor(
        @InjectModel(CoffeeShop.name)
        private readonly coffeeShopModel: Model<CoffeeShopDocument>,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceMemberService: WorkspaceMemberService,
    ) {}

    async findAllForUser(userId: string) {
        const memberships = await this.workspaceMemberService.findAllByUserId(userId);
        const workspaceIds = memberships.map(({ workspaceId }) => workspaceId);

        return this.coffeeShopModel.find({ workspaceId: { $in: workspaceIds }, isActive: true }).exec();
    }

    findAllByWorkspace(workspaceId: string) {
        return this.coffeeShopModel.find({ workspaceId, isActive: true }).exec();
    }

    async findById(id: string) {
        const shop = await this.coffeeShopModel.findById(id).exec();

        if (!shop) throw new NotFoundException(errorMessages.notFound.replace("{0}", CoffeeShop.name));

        return shop;
    }

    async findByIdAndWorkspace(id: string, workspaceId: string) {
        const shop = await this.coffeeShopModel.findOne({ _id: id, workspaceId }).exec();

        if (!shop) throw new NotFoundException(errorMessages.notFound.replace("{0}", CoffeeShop.name));

        return shop;
    }

    findByIdAndWorkspaceOrNull(id: string, workspaceId: string) {
        return this.coffeeShopModel.findOne({ _id: id, workspaceId, isActive: true }).exec();
    }

    async createCoffeeShop(dto: CreateCoffeeShopDto, workspaceId: string) {
        const workspace = await this.workspaceService.findById(workspaceId);

        if (!workspace) throw new NotFoundException(errorMessages.notFound.replace("{0}", "Workspace"));

        const limits = getWorkspacePlanLimits(workspace.planKey);
        const coffeeShopCount = await this.countByWorkspace(workspaceId);

        if (coffeeShopCount >= limits.maxCoffeeShops) {
            throw new ForbiddenException(
                errorMessages.coffeeShopPlanLimitReached.replace("{0}", workspace.planKey),
            );
        }

        const data = {
            ...dto,
            workspaceId,
            kavappPassword: dto.kavappPassword ? encrypt(dto.kavappPassword) : undefined,
        };

        const shop = new this.coffeeShopModel(data);

        return shop.save();
    }

    async updateCoffeeShop(id: string, workspaceId: string, dto: UpdateCoffeeShopDto) {
        const updateData = {
            ...dto,
            kavappPassword: dto.kavappPassword ? encrypt(dto.kavappPassword) : undefined,
        };

        const updated = await this.coffeeShopModel.findOneAndUpdate({ _id: id, workspaceId }, updateData, {
            new: true,
        });

        if (!updated) throw new NotFoundException(errorMessages.notFound.replace("{0}", CoffeeShop.name));

        return updated;
    }

    async deleteCoffeeShop(id: string) {
        const db = this.coffeeShopModel.db;
        const coffeeShopObjectId = new mongoose.Types.ObjectId(id);

        const collectionsToClean = [
            "dailyreports",
            "employees",
            "expensereports",
            "inventoryaudits",
            "facilityexpenses",
            "ownerwithdrawals",
            "kavappinventories",
            "inventoryalertrules",
        ];

        for (const colName of collectionsToClean) {
            await db.collection(colName).deleteMany({ coffeeShopId: coffeeShopObjectId });
        }

        await this.coffeeShopModel.findByIdAndDelete(id).exec();

        return { success: true };
    }

    countByWorkspace(workspaceId: string) {
        return this.coffeeShopModel.countDocuments({ workspaceId, isActive: true });
    }
}
