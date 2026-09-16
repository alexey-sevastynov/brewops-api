import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UsePipes,
    ValidationPipe,
    ForbiddenException,
} from "@nestjs/common";
import { IsEmail, IsEnum, IsArray, IsString, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { WorkspaceMemberService } from "./workspace-member.service";
import { CurrentUser } from "../../common/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/auth/types/authenticated-user";
import { type WorkspaceRoleKey, workspaceRoleKeys } from "./enums/workspace-role-key";

export class CoffeeShopAccessItemDto {
    @IsString()
    coffeeShopId!: string;

    @IsOptional()
    @IsString()
    role?: string;

    @IsArray()
    @IsString({ each: true })
    permissions!: string[];
}

class InviteUserDto {
    @IsEmail()
    email!: string;

    @IsEnum(workspaceRoleKeys)
    role!: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CoffeeShopAccessItemDto)
    coffeeShopAccess?: CoffeeShopAccessItemDto[];
}

class UpdateMemberDto {
    @IsEnum(workspaceRoleKeys)
    role!: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CoffeeShopAccessItemDto)
    coffeeShopAccess?: CoffeeShopAccessItemDto[];
}

class UpdateInvitationDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsEnum(workspaceRoleKeys)
    role!: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    permissions?: string[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CoffeeShopAccessItemDto)
    coffeeShopAccess?: CoffeeShopAccessItemDto[];
}

@Controller("workspaces/:workspaceId")
export class WorkspaceMemberController {
    constructor(private readonly service: WorkspaceMemberService) {}

    @Get("members")
    async listMembers(@Param("workspaceId") workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
        await this.requireWorkspaceMember(user.mongoId, workspaceId);
        return this.service.findAllMembers(workspaceId);
    }

    @Patch("members/:memberId")
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async updateMember(
        @Param("workspaceId") workspaceId: string,
        @Param("memberId") memberId: string,
        @Body() dto: UpdateMemberDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const adminMember = await this.requireWorkspaceAdmin(user.mongoId, workspaceId);

        if (adminMember._id.equals(memberId)) {
            throw new ForbiddenException("Ви не можете редагувати власну роль або права.");
        }

        if (adminMember.role !== workspaceRoleKeys.owner) {
            const targetMember = await this.service.findMemberById(memberId);
            if (targetMember?.role === workspaceRoleKeys.admin || dto.role === workspaceRoleKeys.admin) {
                throw new ForbiddenException(
                    "Тільки власник робочого простору може керувати адміністраторами.",
                );
            }
        }

        return this.service.updateMember(
            memberId,
            workspaceId,
            dto.role as WorkspaceRoleKey,
            dto.permissions || [],
            dto.coffeeShopAccess,
        );
    }

    @Delete("members/:memberId")
    async removeMember(
        @Param("workspaceId") workspaceId: string,
        @Param("memberId") memberId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const adminMember = await this.requireWorkspaceAdmin(user.mongoId, workspaceId);

        if (adminMember._id.equals(memberId)) {
            throw new ForbiddenException("Ви не можете видалити себе з робочого простору.");
        }

        if (adminMember.role !== workspaceRoleKeys.owner) {
            const targetMember = await this.service.findMemberById(memberId);
            if (targetMember?.role === workspaceRoleKeys.admin) {
                throw new ForbiddenException(
                    "Тільки власник робочого простору може видаляти адміністраторів.",
                );
            }
        }

        return this.service.removeMember(memberId, workspaceId);
    }

    @Get("invitations")
    async listInvitations(@Param("workspaceId") workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
        await this.requireWorkspaceMember(user.mongoId, workspaceId);
        return this.service.getInvitations(workspaceId);
    }

    @Post("invitations")
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async invite(
        @Param("workspaceId") workspaceId: string,
        @Body() dto: InviteUserDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const adminMember = await this.requireWorkspaceAdmin(user.mongoId, workspaceId);

        if (adminMember.role !== workspaceRoleKeys.owner && dto.role === workspaceRoleKeys.admin) {
            throw new ForbiddenException(
                "Тільки власник робочого простору може запрошувати адміністраторів.",
            );
        }

        return this.service.inviteUser(
            workspaceId,
            dto.email,
            dto.role as WorkspaceRoleKey,
            dto.permissions || [],
            user.mongoId,
            dto.coffeeShopAccess,
        );
    }

    @Patch("invitations/:invitationId")
    @UsePipes(new ValidationPipe({ whitelist: true }))
    async updateInvitation(
        @Param("workspaceId") workspaceId: string,
        @Param("invitationId") invitationId: string,
        @Body() dto: UpdateInvitationDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const adminMember = await this.requireWorkspaceAdmin(user.mongoId, workspaceId);

        if (adminMember.role !== workspaceRoleKeys.owner) {
            const invitation = await this.service.findInvitationById(invitationId);
            if (invitation?.role === workspaceRoleKeys.admin || dto.role === workspaceRoleKeys.admin) {
                throw new ForbiddenException(
                    "Тільки власник робочого простору може змінювати запрошення адміністраторів.",
                );
            }
        }

        return this.service.updateInvitation(
            invitationId,
            workspaceId,
            dto.role as WorkspaceRoleKey,
            dto.permissions || [],
            dto.coffeeShopAccess,
        );
    }

    @Delete("invitations/:invitationId")
    async cancelInvitation(
        @Param("workspaceId") workspaceId: string,
        @Param("invitationId") invitationId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const adminMember = await this.requireWorkspaceAdmin(user.mongoId, workspaceId);

        if (adminMember.role !== workspaceRoleKeys.owner) {
            const invitation = await this.service.findInvitationById(invitationId);
            if (invitation?.role === workspaceRoleKeys.admin) {
                throw new ForbiddenException(
                    "Тільки власник робочого простору може скасовувати запрошення адміністраторів.",
                );
            }
        }

        return this.service.cancelInvitation(invitationId, workspaceId);
    }

    private async requireWorkspaceMember(userId: string, workspaceId: string) {
        const member = await this.service.findByUserAndWorkspace(userId, workspaceId);
        if (!member) {
            throw new ForbiddenException("You are not a member of this workspace.");
        }
        return member;
    }

    private async requireWorkspaceAdmin(userId: string, workspaceId: string) {
        const member = await this.requireWorkspaceMember(userId, workspaceId);
        if (member.role !== workspaceRoleKeys.owner && member.role !== workspaceRoleKeys.admin) {
            throw new ForbiddenException("Only workspace owners or admins can perform this action.");
        }
        return member;
    }
}
