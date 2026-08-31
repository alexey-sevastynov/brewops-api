import {
    Body,
    Controller,
    ForbiddenException,
    Get,
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
import { workspaceManagementRoles, workspaceRoleKeys } from "../workspace-member/enums/workspace-role-key";
import { errorMessages } from "../../common/constants/error-messages";
import { ChangeWorkspacePlanDto } from "./dto/change-workspace-plan-dto";

@Controller("workspaces")
export class WorkspaceController {
    constructor(
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceMemberService: WorkspaceMemberService,
    ) {}

    @Get()
    async getMyWorkspaces(@CurrentUser() user: AuthenticatedUser) {
        const memberships = await this.workspaceMemberService.findAllByUserId(user.mongoId);

        return this.workspaceService.findByIds(memberships.map(({ workspaceId }) => String(workspaceId)));
    }

    @Post()
    @UsePipes(new ValidationPipe())
    async create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: AuthenticatedUser) {
        const workspace = await this.workspaceService.createWorkspace(dto);

        await this.workspaceMemberService.createMember(
            user.mongoId,
            String(workspace._id),
            workspaceRoleKeys.owner,
        );

        return workspace;
    }

    @Get(":id")
    async findById(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
        await this.requireMembership(user.mongoId, id);

        return this.workspaceService.findById(id);
    }

    @Patch(":id")
    @UsePipes(new ValidationPipe())
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateWorkspaceDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const member = await this.requireMembership(user.mongoId, id);

        if (!workspaceManagementRoles.includes(member.role)) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        return this.workspaceService.updateWorkspace(id, dto);
    }

    @Post(":id/change-plan")
    @UsePipes(new ValidationPipe())
    async changePlan(
        @Param("id") id: string,
        @Body() dto: ChangeWorkspacePlanDto,
        @CurrentUser() user: AuthenticatedUser,
    ) {
        const member = await this.requireMembership(user.mongoId, id);

        if (!workspaceManagementRoles.includes(member.role)) {
            throw new ForbiddenException(errorMessages.insufficientPermissions);
        }

        return this.workspaceService.changePlan(id, dto.planKey);
    }

    private async requireMembership(userId: string, workspaceId: string) {
        const member = await this.workspaceMemberService.findByUserAndWorkspace(userId, workspaceId);

        if (!member) throw new ForbiddenException(errorMessages.insufficientPermissions);

        return member;
    }
}
