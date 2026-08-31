import { ConflictException, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { WorkspaceMember, WorkspaceMemberDocument } from "./workspace-member-schema";
import { WorkspaceRoleKey, workspaceRoleKeys } from "./enums/workspace-role-key";
import { WorkspaceInvitation, WorkspaceInvitationDocument } from "./workspace-invitation.schema";
import { User } from "../user/user-schema";
import { Workspace } from "../workspace/workspace-schema";
import { sendMail } from "../mail-verification/mail-service";
import { getEnv } from "../../common/utils/infra/env-functions";
import { envKeys } from "../../common/enums/infra/env-key";
import { createId } from "../../common/utils/id-generator";

const invitationEmailHtml = (link: string, workspaceName: string) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
    <h2 style="color: #1a1a1a; text-align: center;">Вас запрошено приєднатися до ${workspaceName}</h2>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; text-align: center;">
        Ваш колега запросив вас приєднатися до робочого простору <strong>${workspaceName}</strong> на платформі <strong>BrewOps</strong>.
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="${link}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Прийняти запрошення</a>
    </div>
    <p style="color: #888888; font-size: 12px; text-align: center; margin-top: 40px;">
        Якщо ви не очікували цього повідомлення, ви можете безпечно проігнорувати його.
    </p>
</div>
`;

const directAdditionEmailHtml = (workspaceName: string) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
    <h2 style="color: #1a1a1a; text-align: center;">Вас додано до ${workspaceName}</h2>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; text-align: center;">
        Вас успішно додано до робочого простору <strong>${workspaceName}</strong> на платформі <strong>BrewOps</strong>.
    </p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="${getEnv(envKeys.frontendBaseUrl)}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Перейти в кабінет</a>
    </div>
    <p style="color: #888888; font-size: 12px; text-align: center; margin-top: 40px;">
        Дякуємо, що користуєтесь нашими послугами!
    </p>
</div>
`;

@Injectable()
export class WorkspaceMemberService {
    constructor(
        @InjectModel(WorkspaceMember.name)
        private readonly workspaceMemberModel: Model<WorkspaceMemberDocument>,
        @InjectModel(WorkspaceInvitation.name)
        private readonly invitationModel: Model<WorkspaceInvitationDocument>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Workspace.name)
        private readonly workspaceModel: Model<Workspace>,
    ) {}

    findByUserId(userId: string) {
        return this.workspaceMemberModel.findOne({ userId }).exec();
    }

    findAllByUserId(userId: string) {
        return this.workspaceMemberModel.find({ userId }).exec();
    }

    findByUserAndWorkspace(userId: string, workspaceId: string) {
        return this.workspaceMemberModel.findOne({ userId, workspaceId }).exec();
    }

    createMember(
        userId: string,
        workspaceId: string,
        role: WorkspaceRoleKey = workspaceRoleKeys.owner,
        permissions: string[] = [],
    ) {
        const member = new this.workspaceMemberModel({ userId, workspaceId, role, permissions });

        return member.save() as Promise<WorkspaceMemberDocument>;
    }

    findOwnedWorkspaceByUser(userId: string) {
        return this.workspaceMemberModel.findOne({ userId, role: workspaceRoleKeys.owner }).exec();
    }

    async findAllMembers(workspaceId: string) {
        return this.workspaceMemberModel
            .find({ workspaceId })
            .populate({ path: "userId", select: "userName email firstName lastName" })
            .exec();
    }

    async updateMember(memberId: string, workspaceId: string, role: WorkspaceRoleKey, permissions: string[]) {
        const member = await this.workspaceMemberModel.findOne({ _id: memberId, workspaceId }).exec();
        if (!member) {
            throw new NotFoundException("Workspace member not found");
        }

        if (member.role === workspaceRoleKeys.owner) {
            throw new ForbiddenException("Cannot modify permissions of the OWNER.");
        }

        member.role = role;
        member.permissions = permissions;

        return member.save();
    }

    async removeMember(memberId: string, workspaceId: string) {
        const member = await this.workspaceMemberModel.findOne({ _id: memberId, workspaceId }).exec();
        if (!member) {
            throw new NotFoundException("Workspace member not found");
        }

        if (member.role === workspaceRoleKeys.owner) {
            throw new ForbiddenException("Cannot remove the OWNER of the workspace.");
        }

        await this.workspaceMemberModel.deleteOne({ _id: memberId });
        return { success: true };
    }

    async getInvitations(workspaceId: string) {
        return this.invitationModel.find({ workspaceId, status: "PENDING" }).exec();
    }

    async cancelInvitation(invitationId: string, workspaceId: string) {
        const deleted = await this.invitationModel
            .findOneAndDelete({ _id: invitationId, workspaceId })
            .exec();
        if (!deleted) {
            throw new NotFoundException("Invitation not found");
        }
        return { success: true };
    }

    async inviteUser(
        workspaceId: string,
        email: string,
        role: WorkspaceRoleKey,
        permissions: string[],
        invitedByUserId: string,
    ) {
        const normalizedEmail = email.toLowerCase().trim();

        const workspace = await this.workspaceModel.findById(workspaceId).exec();
        if (!workspace) {
            throw new NotFoundException("Workspace not found");
        }

        const user = await this.userModel.findOne({ email: normalizedEmail }).exec();

        if (user) {
            const existingMember = await this.workspaceMemberModel
                .findOne({
                    userId: user._id,
                    workspaceId: workspace._id,
                })
                .exec();

            if (existingMember) {
                throw new ConflictException("User is already a member of this workspace.");
            }

            await this.createMember(user._id.toString(), workspace._id.toString(), role, permissions);

            await sendMail({
                to: normalizedEmail,
                subject: `Вас додано до робочого простору ${workspace.name}`,
                html: directAdditionEmailHtml(workspace.name),
            });

            return { success: true, addedDirectly: true };
        } else {
            const existingInvitation = await this.invitationModel
                .findOne({
                    email: normalizedEmail,
                    workspaceId: workspace._id,
                    status: "PENDING",
                })
                .exec();

            if (existingInvitation) {
                throw new ConflictException("An invitation is already pending for this email.");
            }

            const token = createId();

            await this.invitationModel.create({
                email: normalizedEmail,
                workspaceId: workspace._id,
                role,
                permissions,
                token,
                status: "PENDING",
                invitedBy: new mongoose.Types.ObjectId(invitedByUserId),
            });

            const link = `${getEnv(envKeys.frontendBaseUrl)}/sign-in?email=${encodeURIComponent(normalizedEmail)}&token=${token}&mode=signup`;

            await sendMail({
                to: normalizedEmail,
                subject: `Запрошення приєднатися до робочого простору ${workspace.name}`,
                html: invitationEmailHtml(link, workspace.name),
            });

            return { success: true, addedDirectly: false };
        }
    }
}
