import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type WorkspaceRoleKey, workspaceRoleKeys } from "./enums/workspace-role-key";

export type WorkspaceInvitationDocument = WorkspaceInvitation & Document;

@Schema({ timestamps: true })
export class WorkspaceInvitation {
    @Prop({ required: true })
    email!: string;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "Workspace" })
    workspaceId!: mongoose.Types.ObjectId;

    @Prop({ required: true, type: String, default: workspaceRoleKeys.custom, enum: workspaceRoleKeys })
    role!: WorkspaceRoleKey;

    @Prop({ type: [String], default: [] })
    permissions!: string[];

    @Prop({
        type: [
            {
                coffeeShopId: { type: mongoose.Schema.Types.ObjectId, ref: "CoffeeShop", required: true },
                role: { type: String, default: "custom" },
                permissions: { type: [String], default: [] },
            },
        ],
        default: [],
    })
    coffeeShopAccess!: Array<{
        coffeeShopId: mongoose.Types.ObjectId;
        role?: string;
        permissions: string[];
    }>;

    @Prop({ required: true, unique: true })
    token!: string;

    @Prop({ required: true, default: "PENDING", enum: ["PENDING", "ACCEPTED"] })
    status!: string;

    @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: "User" })
    invitedBy!: mongoose.Types.ObjectId;
}

export const WorkspaceInvitationSchema = SchemaFactory.createForClass(WorkspaceInvitation);

WorkspaceInvitationSchema.index({ email: 1 });
WorkspaceInvitationSchema.index({ token: 1 }, { unique: true });
