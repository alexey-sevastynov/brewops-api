import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { User } from "../../resources/user/user-schema";
import { createId } from "../../common/utils/id-generator";
import { userStatusKeys } from "../../resources/user/enums/user-status-key";
import { SignUpDto } from "./dto/sign-up-dto";
import { SignInDto } from "./dto/sign-in-dto";
import { verifyUserCredentials } from "./validators/auth-validators";
import { throwIfDuplicateKey } from "../../common/utils/mongo-errors";
import { MailVerificationService } from "../../resources/mail-verification/mail-verification.service";
import { AuthResponse } from "./types/auth-response";
import { WithObjectId } from "../../common/types/with-object-id";
import { errorMessages } from "../../common/constants/error-messages";
import { WorkspaceService } from "../../resources/workspace/workspace.service";
import { WorkspaceMemberService } from "../../resources/workspace-member/workspace-member.service";
import {
    workspaceRoleKeys,
    type WorkspaceRoleKey,
} from "../../resources/workspace-member/enums/workspace-role-key";
import { sendAdminUserCreatedNotification } from "../user/utils/user-email-notifications";

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<User>,
        private jwtService: JwtService,
        private mailVerificationService: MailVerificationService,
        private workspaceService: WorkspaceService,
        private workspaceMemberService: WorkspaceMemberService,
    ) {}

    async signUp(auth: SignUpDto) {
        const hashedPassword = await bcrypt.hash(auth.password, 10);
        const emailNormalized = auth.email.toLowerCase().trim();

        const newUser = {
            userId: createId(),
            userName: auth.userName,
            email: emailNormalized,
            password: hashedPassword,
            userStatus: userStatusKeys.active,
            isVerified: false,
            firstName: auth.firstName,
            lastName: auth.lastName,
            phoneNumber: auth.phoneNumber,
        };

        try {
            const user = await this.userModel.create(newUser);
            const db = this.userModel.db;

            let primaryWorkspaceId: string | undefined;

            if (auth.invitationToken) {
                // Secure path: validate via the unique token from the invite email
                const invitation = await db
                    .collection<{
                        _id: mongoose.Types.ObjectId;
                        workspaceId: mongoose.Types.ObjectId;
                        role: WorkspaceRoleKey;
                        permissions: string[];
                        email: string;
                        status: string;
                    }>("workspaceinvitations")
                    .findOne({
                        token: auth.invitationToken,
                        status: "PENDING",
                    });

                if (invitation && invitation.email === emailNormalized) {
                    await this.workspaceMemberService.createMember(
                        user._id.toString(),
                        invitation.workspaceId.toString(),
                        invitation.role,
                        invitation.permissions,
                    );

                    await db
                        .collection("workspaceinvitations")
                        .updateOne({ _id: invitation._id }, { $set: { status: "ACCEPTED" } });

                    primaryWorkspaceId = invitation.workspaceId.toString();
                }
            }

            // If no valid token invitation was found — create own workspace
            if (!primaryWorkspaceId) {
                const workspace = await this.workspaceService.createWorkspace({
                    name: `${auth.userName}'s workspace`,
                });

                await this.workspaceMemberService.createMember(
                    user._id.toString(),
                    String(workspace._id),
                    workspaceRoleKeys.owner,
                );

                primaryWorkspaceId = String(workspace._id);
            }

            await this.#sendVerificationOrFail(user.email, user._id);

            void sendAdminUserCreatedNotification({
                email: user.email,
                userName: user.userName,
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
            });

            const authResponse = this.#createAuthResponse(
                user._id,
                user.userId,
                user.userName,
                user.isVerified,
                primaryWorkspaceId,
            );

            return authResponse;
        } catch (error) {
            throwIfDuplicateKey(error);
        }
    }

    async signIn(auth: SignInDto) {
        const findOneUser = await this.userModel.findOne({ email: auth.email.toLowerCase().trim() });
        const user = await verifyUserCredentials(findOneUser, auth.password);

        if (!user.isVerified) {
            throw new UnauthorizedException(errorMessages.emailNotVerified);
        }

        const workspaceMember = await this.workspaceMemberService.findByUserId(user._id.toString());

        const authResponse = this.#createAuthResponse(
            user._id,
            user.userId,
            user.userName,
            user.isVerified,
            workspaceMember?.workspaceId.toString(),
        );

        return authResponse;
    }

    #createAuthResponse(
        mongoId: mongoose.Types.ObjectId,
        userId: string,
        userName: string,
        isVerified = false,
        workspaceId?: string,
    ) {
        const mongoIdString = mongoId.toString();
        const token = this.jwtService.sign({ id: mongoIdString });
        const response: AuthResponse = { token, userId, userName, isVerified, workspaceId };

        return response;
    }

    #sendVerificationOrFail = async (email: string, userId: WithObjectId) => {
        try {
            await this.mailVerificationService.sendVerificationEmail(email, userId);
        } catch {
            await this.userModel.findByIdAndDelete(userId);

            throw new UnauthorizedException(errorMessages.unableToSendVerificationEmail);
        }
    };
}
