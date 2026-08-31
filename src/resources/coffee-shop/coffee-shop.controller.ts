import {
    Body,
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    UsePipes,
    ValidationPipe,
    ForbiddenException,
} from "@nestjs/common";
import { CoffeeShopService } from "./coffee-shop.service";
import { CreateCoffeeShopDto } from "./dto/create-coffee-shop-dto";
import { UpdateCoffeeShopDto } from "./dto/update-coffee-shop-dto";
import { CurrentUser } from "../../common/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/auth/types/authenticated-user";
import { WorkspaceMemberService } from "../workspace-member/workspace-member.service";
import { errorMessages } from "../../common/constants/error-messages";
import { workspaceManagementRoles } from "../workspace-member/enums/workspace-role-key";

@Controller("coffee-shops")
export class CoffeeShopController {
    constructor(
        private readonly coffeeShopEntityService: CoffeeShopService,
        private readonly workspaceMemberService: WorkspaceMemberService,
    ) {}

    @Get()
    async findAll(@CurrentUser() user: AuthenticatedUser) {
        return this.coffeeShopEntityService.findAllForUser(user.mongoId);
    }

    @Get(":id")
    async findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
        const shop = await this.coffeeShopEntityService.findById(id);
        await this.requireMembership(user.mongoId, String(shop.workspaceId));

        return shop;
    }

    @Post()
    @UsePipes(new ValidationPipe())
    async create(@Body() dto: CreateCoffeeShopDto, @CurrentUser() user: AuthenticatedUser) {
        const ownedWorkspaceMember = await this.workspaceMemberService.findOwnedWorkspaceByUser(user.mongoId);
        if (!ownedWorkspaceMember) {
            throw new ForbiddenException("No owned workspace found to create coffee shop.");
        }

        return this.coffeeShopEntityService.createCoffeeShop(dto, String(ownedWorkspaceMember.workspaceId));
    }

    @Patch(":id")
    @UsePipes(new ValidationPipe())
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateCoffeeShopDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const shop = await this.coffeeShopEntityService.findById(id);
        const member = await this.requireMembership(user.mongoId, String(shop.workspaceId));

        if (!workspaceManagementRoles.includes(member.role)) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        return this.coffeeShopEntityService.updateCoffeeShop(id, String(shop.workspaceId), dto);
    }

    @Delete(":id")
    async delete(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
        const shop = await this.coffeeShopEntityService.findById(id);
        const member = await this.requireMembership(user.mongoId, String(shop.workspaceId));

        if (!workspaceManagementRoles.includes(member.role)) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        return this.coffeeShopEntityService.deleteCoffeeShop(id);
    }

    private async requireMembership(userId: string, workspaceId: string) {
        const member = await this.workspaceMemberService.findByUserAndWorkspace(userId, workspaceId);

        if (!member) throw new ForbiddenException(errorMessages.insufficientPermissions);

        return member;
    }
}
