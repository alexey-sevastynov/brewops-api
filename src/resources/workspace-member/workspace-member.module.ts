import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { WorkspaceMember, WorkspaceMemberSchema } from "./workspace-member-schema";
import { WorkspaceMemberService } from "./workspace-member.service";
import { WorkspaceInvitation, WorkspaceInvitationSchema } from "./workspace-invitation.schema";
import { User, UserSchema } from "../user/user-schema";
import { Workspace, WorkspaceSchema } from "../workspace/workspace-schema";

import { WorkspaceMemberController } from "./workspace-member.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: WorkspaceMember.name, schema: WorkspaceMemberSchema },
            { name: WorkspaceInvitation.name, schema: WorkspaceInvitationSchema },
            { name: User.name, schema: UserSchema },
            { name: Workspace.name, schema: WorkspaceSchema },
        ]),
    ],
    controllers: [WorkspaceMemberController],
    providers: [WorkspaceMemberService],
    exports: [WorkspaceMemberService, MongooseModule],
})
export class WorkspaceMemberModule {}
