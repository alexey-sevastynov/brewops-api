import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CoffeeShop, CoffeeShopDocument } from "../../../resources/coffee-shop/coffee-shop-schema";
import {
    WorkspaceMember,
    WorkspaceMemberDocument,
} from "../../../resources/workspace-member/workspace-member-schema";
import {
    CoffeeShopAccess,
    CoffeeShopAccessDocument,
} from "../../../resources/coffee-shop-access/coffee-shop-access.schema";
import { errorMessages } from "../../../common/constants/error-messages";
import { PERMISSION_METADATA_KEY, RequiredPermission } from "../decorators/check-permission.decorator";
import { AuthenticatedUser } from "../../../common/auth/types/authenticated-user";
import { workspaceRoleKeys } from "../../../resources/workspace-member/enums/workspace-role-key";
import { WorkspaceService } from "../../../resources/workspace/workspace.service";
import { type WorkspaceDocument } from "../../../resources/workspace/workspace-schema";
import { getWorkspacePlanLimits } from "../../../common/config/workspace-plan.config";
import { resourceNames } from "../../../common/constants/resource-names";

interface GuardRequest {
    user: AuthenticatedUser;
    params: Record<string, string>;
    coffeeShop?: CoffeeShopDocument;
    workspace?: WorkspaceDocument;
    workspaceMember?: WorkspaceMemberDocument;
    coffeeShopAccess?: CoffeeShopAccessDocument;
    [key: string]: unknown;
}

@Injectable()
export class CoffeeShopGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @InjectModel(CoffeeShop.name) private readonly coffeeShopModel: Model<CoffeeShop>,
        @InjectModel(WorkspaceMember.name)
        private readonly workspaceMemberModel: Model<WorkspaceMember>,
        @InjectModel(CoffeeShopAccess.name)
        private readonly coffeeShopAccessModel: Model<CoffeeShopAccessDocument>,
        private readonly workspaceService: WorkspaceService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<GuardRequest>();
        const coffeeShopId = request.params.coffeeShopId;

        if (!coffeeShopId) {
            // If no coffeeShopId param in route, allow request (assuming it's handled by other guards)
            return true;
        }

        // 1. Fetch Coffee Shop
        const coffeeShop = await this.coffeeShopModel.findById(coffeeShopId).exec();
        if (!coffeeShop) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", "Coffee Shop"));
        }

        // 2. Fetch Workspace Membership
        const member = await this.workspaceMemberModel
            .findOne({
                userId: request.user.mongoId,
                workspaceId: coffeeShop.workspaceId,
            })
            .exec();

        if (!member) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        const workspace = await this.workspaceService.findById(String(coffeeShop.workspaceId));

        request.coffeeShop = coffeeShop;
        request.workspace = workspace ?? undefined;
        request.workspaceMember = member;

        const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
            PERMISSION_METADATA_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (requiredPermission?.resource === resourceNames.kavapp && workspace) {
            const limits = getWorkspacePlanLimits(workspace.planKey);
            if (!limits.allowKavappIntegration) {
                throw new ForbiddenException(errorMessages.kavappPlanRestricted);
            }
        }

        if (member.role === workspaceRoleKeys.owner || member.role === workspaceRoleKeys.admin) {
            return true;
        }

        const shopAccess = await this.coffeeShopAccessModel
            .findOne({
                memberId: member._id,
                coffeeShopId: coffeeShop._id,
            })
            .exec();

        if (!shopAccess) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        request.coffeeShopAccess = shopAccess;

        if (!requiredPermission) {
            return true;
        }

        const { resource, action } = requiredPermission;
        const permissions = shopAccess.permissions || [];

        // Check if user has specific action permission, full resource permission, or wildcard
        const hasAccess =
            permissions.includes(`${resource}:${action}`) ||
            permissions.includes(resource) ||
            permissions.includes("*:*");

        if (!hasAccess) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        return true;
    }
}
