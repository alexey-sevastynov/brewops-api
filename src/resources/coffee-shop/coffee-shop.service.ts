import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { CoffeeShop } from "./coffee-shop-schema";
import { CreateCoffeeShopDto } from "./dto/create-coffee-shop-dto";
import { UpdateCoffeeShopDto } from "./dto/update-coffee-shop-dto";
import { errorMessages } from "../../common/constants/error-messages";
import { WorkspaceService } from "../workspace/workspace.service";
import { WorkspaceMemberService } from "../workspace-member/workspace-member.service";
import { CoffeeShopAccessService } from "../coffee-shop-access/coffee-shop-access.service";
import { getWorkspacePlanLimits } from "../../common/config/workspace-plan.config";
import { encrypt } from "../../common/utils/crypto";
import { workspaceRoleKeys } from "../workspace-member/enums/workspace-role-key";

@Injectable()
export class CoffeeShopService {
    constructor(
        @InjectModel(CoffeeShop.name)
        private readonly coffeeShopModel: Model<CoffeeShop>,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly coffeeShopAccessService: CoffeeShopAccessService,
    ) {}

    async findAllForUser(userId: string) {
        const memberships = await this.workspaceMemberService.findAllByUserId(userId);
        if (!memberships.length) {
            return [];
        }

        const ownerOrAdminWorkspaceIds = memberships
            .filter((m) => m.role === workspaceRoleKeys.owner || m.role === workspaceRoleKeys.admin)
            .map(({ workspaceId }) => workspaceId);

        const restrictedMemberships = memberships.filter(
            (m) => m.role !== workspaceRoleKeys.owner && m.role !== workspaceRoleKeys.admin,
        );
        const restrictedMemberIds = restrictedMemberships.map((m) => m._id);

        const explicitAccesses = restrictedMemberIds.length
            ? await this.coffeeShopAccessService.findAllByMemberIds(restrictedMemberIds)
            : [];

        const explicitCoffeeShopIds = explicitAccesses.map((a) => a.coffeeShopId);

        const orConditions: Array<Record<string, unknown>> = [];
        if (ownerOrAdminWorkspaceIds.length) {
            orConditions.push({ workspaceId: { $in: ownerOrAdminWorkspaceIds } });
        }
        if (explicitCoffeeShopIds.length) {
            orConditions.push({ _id: { $in: explicitCoffeeShopIds } });
        }

        if (!orConditions.length) {
            return [];
        }

        const shops = await this.coffeeShopModel.find({ $or: orConditions, isActive: true }).lean().exec();

        const uniqueWorkspaceIds = [...new Set(shops.map((s) => String(s.workspaceId)))];
        const [workspaces, owners] = await Promise.all([
            this.workspaceService.findByIds(uniqueWorkspaceIds),
            this.workspaceMemberService.findOwnersByWorkspaceIds(uniqueWorkspaceIds),
        ]);

        return shops.map((shop) => {
            const ws = workspaces.find((w) => String(w._id) === String(shop.workspaceId));
            const owner = owners.find((o) => String(o.workspaceId) === String(shop.workspaceId));
            const ownerUser = owner?.userId as unknown as
                | { userName?: string; email?: string; firstName?: string; lastName?: string }
                | undefined;
            const ownerName =
                [ownerUser?.firstName, ownerUser?.lastName].filter(Boolean).join(" ") ||
                ownerUser?.userName ||
                "Власник";

            const myMembership = memberships.find((m) => String(m.workspaceId) === String(shop.workspaceId));
            let myRole: string = myMembership?.role || workspaceRoleKeys.custom;
            let myPermissions: string[] = [];

            if (myRole === workspaceRoleKeys.owner || myRole === workspaceRoleKeys.admin) {
                myPermissions = ["*:*"];
            } else {
                const myShopAccess = explicitAccesses.find(
                    (a) =>
                        a.coffeeShopId.equals(shop._id) &&
                        !!myMembership &&
                        a.memberId.equals(myMembership._id),
                );
                if (myShopAccess) {
                    myRole = myShopAccess.role;
                    myPermissions = myShopAccess.permissions || [];
                }
            }

            return {
                ...shop,
                workspace: {
                    _id: String(shop.workspaceId),
                    name: ws?.name || "Робочий простір",
                    ownerName,
                    ownerEmail: ownerUser?.email,
                },
                myAccess: {
                    role: myRole,
                    permissions: myPermissions,
                    isOwner: myMembership?.role === workspaceRoleKeys.owner,
                },
            };
        });
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

        const hasKavappData = Boolean(
            dto.kavappEmail?.trim() || dto.kavappPassword?.trim() || dto.kavappPointId?.trim(),
        );
        const hasTelegramData = Boolean(dto.telegramChatId?.trim());

        if (!limits.allowKavappIntegration && hasKavappData) {
            throw new ForbiddenException(errorMessages.kavappPlanRestricted);
        }

        if (!limits.allowTelegramIntegration && hasTelegramData) {
            throw new ForbiddenException(errorMessages.telegramPlanRestricted);
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
        const workspace = await this.workspaceService.findById(workspaceId);

        if (!workspace) throw new NotFoundException(errorMessages.notFound.replace("{0}", "Workspace"));

        const limits = getWorkspacePlanLimits(workspace.planKey);

        const hasKavappData = Boolean(
            dto.kavappEmail?.trim() || dto.kavappPassword?.trim() || dto.kavappPointId?.trim(),
        );
        const hasTelegramData = Boolean(dto.telegramChatId?.trim());

        if (!limits.allowKavappIntegration && hasKavappData) {
            throw new ForbiddenException(errorMessages.kavappPlanRestricted);
        }

        if (!limits.allowTelegramIntegration && hasTelegramData) {
            throw new ForbiddenException(errorMessages.telegramPlanRestricted);
        }

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

        await this.coffeeShopAccessService.deleteByCoffeeShopId(id);

        await this.coffeeShopModel.findByIdAndDelete(id).exec();

        return { success: true };
    }

    countByWorkspace(workspaceId: string) {
        return this.coffeeShopModel.countDocuments({ workspaceId, isActive: true });
    }
}
