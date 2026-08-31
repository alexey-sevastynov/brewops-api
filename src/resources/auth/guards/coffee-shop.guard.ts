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
import { errorMessages } from "../../../common/constants/error-messages";
import { PERMISSION_METADATA_KEY, RequiredPermission } from "../decorators/check-permission.decorator";
import { AuthenticatedUser } from "../../../common/auth/types/authenticated-user";
import { workspaceRoleKeys } from "resources/workspace-member/enums/workspace-role-key";

interface GuardRequest {
    user: AuthenticatedUser;
    params: Record<string, string>;
    coffeeShop?: CoffeeShopDocument;
    workspaceMember?: WorkspaceMemberDocument;
    [key: string]: unknown;
}

@Injectable()
export class CoffeeShopGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @InjectModel(CoffeeShop.name) private readonly coffeeShopModel: Model<CoffeeShopDocument>,
        @InjectModel(WorkspaceMember.name)
        private readonly workspaceMemberModel: Model<WorkspaceMemberDocument>,
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

        // Attach coffeeShop and member to request for downstream usage
        request.coffeeShop = coffeeShop;
        request.workspaceMember = member;

        // 3. Check Permissions
        const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
            PERMISSION_METADATA_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermission) {
            // If no decorator is specified, default to allowing access based on membership alone
            return true;
        }

        const { resource, action } = requiredPermission;
        const { role, permissions = [] } = member;

        // OWNER and ADMIN can do everything
        if (role === workspaceRoleKeys.owner || role === workspaceRoleKeys.admin) {
            return true;
        }

        // MANAGER cannot delete
        if (role === workspaceRoleKeys.manager) {
            if (action === "delete") {
                throw new ForbiddenException(errorMessages.insufficientPermissions);
            }
            return true;
        }

        // BARISTA only has access to explicitly allowed permissions
        if (role === workspaceRoleKeys.barista) {
            if (action === "delete") {
                throw new ForbiddenException(errorMessages.insufficientPermissions);
            }

            // Check if they have the specific action or the general resource access
            const hasAccess =
                permissions.includes(`${resource}:${action}`) ||
                permissions.includes(resource) ||
                permissions.includes("*:*");

            if (!hasAccess) {
                throw new ForbiddenException(errorMessages.insufficientPermissions);
            }

            return true;
        }

        throw new ForbiddenException(errorMessages.insufficientPermissions);
    }
}
