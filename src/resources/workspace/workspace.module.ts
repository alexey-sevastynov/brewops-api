import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Workspace, WorkspaceSchema } from "./workspace-schema";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceController } from "./workspace.controller";
import { WorkspaceMemberModule } from "../workspace-member/workspace-member.module";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Workspace.name, schema: WorkspaceSchema }]),
        WorkspaceMemberModule,
    ],
    controllers: [WorkspaceController],
    providers: [WorkspaceService],
    exports: [WorkspaceService],
})
export class WorkspaceModule {}
