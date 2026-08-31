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
import { IsEmail, IsEnum, IsArray, IsString } from "class-validator";
import { WorkspaceMemberService } from "./workspace-member.service";
import { CurrentUser } from "../../common/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/auth/types/authenticated-user";
import { type WorkspaceRoleKey, workspaceRoleKeys } from "./enums/workspace-role-key";

class InviteUserDto {
    @IsEmail()
    email!: string;

    @IsEnum(workspaceRoleKeys)
    role!: string;

    @IsArray()
    @IsString({ each: true })
    permissions!: string[];
}

class UpdateMemberDto {
    @IsEnum(workspaceRoleKeys)
    role!: string;

    @IsArray()
    @IsString({ each: true })
    permissions!: string[];
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
        await this.requireWorkspaceAdmin(user.mongoId, workspaceId);
        return this.service.updateMember(
            memberId,
            workspaceId,
            dto.role as WorkspaceRoleKey,
            dto.permissions,
        );
    }

    @Delete("members/:memberId")
    async removeMember(
        @Param("workspaceId") workspaceId: string,
        @Param("memberId") memberId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.requireWorkspaceAdmin(user.mongoId, workspaceId);
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
        await this.requireWorkspaceAdmin(user.mongoId, workspaceId);
        return this.service.inviteUser(
            workspaceId,
            dto.email,
            dto.role as WorkspaceRoleKey,
            dto.permissions,
            user.mongoId,
        );
    }

    @Delete("invitations/:invitationId")
    async cancelInvitation(
        @Param("workspaceId") workspaceId: string,
        @Param("invitationId") invitationId: string,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        await this.requireWorkspaceAdmin(user.mongoId, workspaceId);
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
