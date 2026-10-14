import mongoose, { Document } from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type WorkspacePlanKey, workspacePlanKeys } from "./enums/workspace-plan-key";

export type WorkspaceDocument = Workspace & Document;

@Schema({ timestamps: true })
export class Workspace {
    _id!: mongoose.Types.ObjectId;

    @Prop({ required: true })
    name!: string;

    @Prop({ required: true, default: workspacePlanKeys.free, enum: workspacePlanKeys })
    planKey!: WorkspacePlanKey;

    createdAt!: Date;
    updatedAt!: Date;
}

export const WorkspaceSchema = SchemaFactory.createForClass(Workspace);
