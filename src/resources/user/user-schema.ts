import { Document } from "mongoose";
import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { type UserStatusKey, userStatusKeys } from "./enums/user-status-key";
import { timing } from "../../common/constants/timing";

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true })
    userId!: string;

    @Prop({ required: true, unique: true })
    userName!: string;

    @Prop({ required: true, unique: true })
    email!: string;

    @Prop({ required: true })
    password!: string;

    @Prop({ required: true, default: userStatusKeys.active, enum: userStatusKeys })
    userStatus!: UserStatusKey;

    @Prop({ required: true, default: false })
    isVerified!: boolean;

    @Prop({ required: false })
    blockReason?: string;

    @Prop({ required: false })
    firstName?: string;

    @Prop({ required: false })
    lastName?: string;

    @Prop({ required: false, unique: true, sparse: true })
    phoneNumber?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: timing.oneHourInSeconds, partialFilterExpression: { isVerified: false } },
);
