import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type WorkspaceRoleKey, workspaceRoleKeys } from "./enums/workspace-role-key";

export type WorkspaceMemberDocument = WorkspaceMember & Document;

@Schema({ timestamps: true })
export class WorkspaceMember {
    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "User" })
    userId!: mongoose.Types.ObjectId;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "Workspace" })
    workspaceId!: mongoose.Types.ObjectId;

    @Prop({ required: true, default: workspaceRoleKeys.owner, enum: workspaceRoleKeys })
    role!: WorkspaceRoleKey;

    @Prop({ type: [String], default: [] })
    permissions!: string[];
}

export const WorkspaceMemberSchema = SchemaFactory.createForClass(WorkspaceMember);

WorkspaceMemberSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });
