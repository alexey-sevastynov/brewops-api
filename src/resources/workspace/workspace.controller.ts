import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Patch,
    Param,
    Post,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { CreateWorkspaceDto } from "./dto/create-workspace-dto";
import { UpdateWorkspaceDto } from "./dto/update-workspace-dto";
import { CurrentUser } from "../../common/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/auth/types/authenticated-user";
import { WorkspaceMemberService } from "../workspace-member/workspace-member.service";
import {
    WorkspaceRoleKey,
    workspaceManagementRoles,
    workspaceRoleKeys,
} from "../workspace-member/enums/workspace-role-key";
import { errorMessages } from "../../common/constants/error-messages";
import { ChangeWorkspacePlanDto } from "./dto/change-workspace-plan-dto";
import type { WorkspacePlanKey } from "./enums/workspace-plan-key";
import { WithObjectId } from "../../common/types/with-object-id";
import { BaseDto } from "../../common/dto/base-dto";

export interface WorkspaceWithRole extends WithObjectId, BaseDto {
    name: string;
    planKey: WorkspacePlanKey;
    role: WorkspaceRoleKey;
    isOwner: boolean;
}

@Controller("workspaces")
export class WorkspaceController {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceMemberService: WorkspaceMemberService,
    ) {}

    @Get()
    async getMyWorkspaces(@CurrentUser() user: AuthenticatedUser): Promise<WorkspaceWithRole[]> {
        const memberships = await this.workspaceMemberService.findAllByUserId(user.mongoId);
        const membershipByWorkspaceId = new Map(
            memberships.map((membership) => [String(membership.workspaceId), membership]),
        );

        const workspaces = await this.workspaceService.findByIds(Array.from(membershipByWorkspaceId.keys()));

        return workspaces.map((workspace) => {
            const member = membershipByWorkspaceId.get(String(workspace._id));
            const role = member?.role || workspaceRoleKeys.custom;

            return {
                _id: workspace._id,
                name: workspace.name,
                planKey: workspace.planKey,
                role,
                isOwner: role === workspaceRoleKeys.owner,
                createdAt: workspace.createdAt,
                updatedAt: workspace.updatedAt,
            };
        });
    }

    @Post()
    @UsePipes(new ValidationPipe())
    async create(
        @Body() dto: CreateWorkspaceDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<WorkspaceWithRole> {
        const workspace = await this.workspaceService.createWorkspace(dto);

        await this.workspaceMemberService.createMember(
            user.mongoId,
            String(workspace._id),
            workspaceRoleKeys.owner,
        );

        return {
            _id: workspace._id,
            name: workspace.name,
            planKey: workspace.planKey,
            role: workspaceRoleKeys.owner,
            isOwner: true,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
        };
    }

    @Get(":id")
    async findById(
        @Param("id") id: string,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<WorkspaceWithRole> {
        const member = await this.requireMembership(user.mongoId, id);
        const workspace = await this.workspaceService.findById(id);

        if (!workspace) {
            throw new NotFoundException(errorMessages.notFound.replace("{0}", "Workspace"));
        }

        return {
            _id: workspace._id,
            name: workspace.name,
            planKey: workspace.planKey,
            role: member.role,
            isOwner: member.role === workspaceRoleKeys.owner,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
        };
    }

    @Patch(":id")
    @UsePipes(new ValidationPipe())
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateWorkspaceDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<WorkspaceWithRole> {
        const member = await this.requireMembership(user.mongoId, id);

        if (!workspaceManagementRoles.includes(member.role)) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        const updated = await this.workspaceService.updateWorkspace(id, dto);

        return {
            _id: updated._id,
            name: updated.name,
            planKey: updated.planKey,
            role: member.role,
            isOwner: member.role === workspaceRoleKeys.owner,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    @Post(":id/change-plan")
    @UsePipes(new ValidationPipe())
    async changePlan(
        @Param("id") id: string,
        @Body() dto: ChangeWorkspacePlanDto,
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<WorkspaceWithRole> {
        const member = await this.requireMembership(user.mongoId, id);

        if (!workspaceManagementRoles.includes(member.role)) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        const updated = await this.workspaceService.changePlan(id, dto.planKey);

        return {
            _id: updated._id,
            name: updated.name,
            planKey: updated.planKey,
            role: member.role,
            isOwner: member.role === workspaceRoleKeys.owner,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
        };
    }

    private async requireMembership(userId: string, workspaceId: string) {
        const member = await this.workspaceMemberService.findByUserAndWorkspace(userId, workspaceId);

        if (!member) throw new ForbiddenException(errorMessages.insufficientPermissions);

        return member;
    }
}
