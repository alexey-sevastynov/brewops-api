import { ConflictException, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { WorkspaceMember } from "./workspace-member-schema";
import { WorkspaceRoleKey, workspaceRoleKeys } from "./enums/workspace-role-key";
import { WorkspaceInvitation, WorkspaceInvitationDocument } from "./workspace-invitation.schema";
import { User } from "../user/user-schema";
import { Workspace } from "../workspace/workspace-schema";
import { CoffeeShopAccessService, SetShopAccessItem } from "../coffee-shop-access/coffee-shop-access.service";
import { sendMail } from "../mail-verification/mail-service";
import { getEnv } from "../../common/utils/infra/env-functions";
import { envKeys } from "../../common/enums/infra/env-key";
import { createId } from "../../common/utils/id-generator";
import { getWorkspacePlanLimits } from "../../common/config/workspace-plan.config";
import { errorMessages } from "../../common/constants/error-messages";

const invitationEmailHtml = (link: string, workspaceName: string, email?: string) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <h2 style="color: #0f172a; text-align: center; margin-bottom: 8px; font-size: 22px;">Вас запросили до кав'ярні в системі BrewOps!</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
        Власник робочого простору <strong>${workspaceName}</strong> надав вам доступ до команди кав'ярні та робочих модулів на платформі <strong>BrewOps</strong>.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
        <p style="color: #1e293b; font-size: 14px; font-weight: bold; margin: 0 0 10px 0;">Що потрібно зробити:</p>
        <ol style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">Натисніть кнопку нижче для переходу до форми реєстрації.</li>
            <li style="margin-bottom: 6px;">Зареєструйтесь за вашою поштою ${email ? `(<strong>${email}</strong>)` : ""}.</li>
            <li>Після створення акаунта вам автоматично відкриється доступ до кав'ярні.</li>
        </ol>
    </div>

    <div style="text-align: center; margin: 28px 0;">
        <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">Зареєструватися та отримати доступ</a>
    </div>

    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        Якщо ви не очікували цього повідомлення, можете безпечно проігнорувати його.
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
        private readonly workspaceMemberModel: Model<WorkspaceMember>,
        @InjectModel(WorkspaceInvitation.name)
        private readonly invitationModel: Model<WorkspaceInvitationDocument>,
        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        @InjectModel(Workspace.name)
        private readonly workspaceModel: Model<Workspace>,
        private readonly coffeeShopAccessService: CoffeeShopAccessService,
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

    findMemberById(memberId: string) {
        return this.workspaceMemberModel.findById(memberId).exec();
    }

    findInvitationById(invitationId: string) {
        return this.invitationModel.findById(invitationId).exec();
    }

    createMember(
        userId: string,
        workspaceId: string,
        role: WorkspaceRoleKey = workspaceRoleKeys.owner,
        permissions: string[] = [],
    ) {
        const member = new this.workspaceMemberModel({ userId, workspaceId, role, permissions });

        return member.save();
    }

    findOwnedWorkspaceByUser(userId: string) {
        return this.workspaceMemberModel.findOne({ userId, role: workspaceRoleKeys.owner }).exec();
    }

    findOwnersByWorkspaceIds(workspaceIds: string[]) {
        const objectIds = workspaceIds.map((id) => new mongoose.Types.ObjectId(id));
        return this.workspaceMemberModel
            .find({ workspaceId: { $in: objectIds }, role: workspaceRoleKeys.owner })
            .populate({ path: "userId", select: "userName email firstName lastName" })
            .lean()
            .exec();
    }

    async checkMemberLimit(workspaceId: string) {
        const workspace = await this.workspaceModel.findById(workspaceId).exec();
        if (!workspace) throw new NotFoundException("Workspace not found");

        const limits = getWorkspacePlanLimits(workspace.planKey);
        const currentMemberCount = await this.workspaceMemberModel.countDocuments({ workspaceId }).exec();

        if (currentMemberCount >= limits.maxMembers) {
            throw new ForbiddenException(
                errorMessages.memberPlanLimitReached.replace("{0}", workspace.planKey),
            );
        }
    }

    async findAllMembers(workspaceId: string) {
        const members = await this.workspaceMemberModel
            .find({ workspaceId })
            .populate({ path: "userId", select: "userName email firstName lastName" })
            .lean()
            .exec();

        const memberIds = members.map((m) => m._id);
        const accesses = await this.coffeeShopAccessService.findAllByMemberIds(memberIds);

        return members.map((member) => {
            const memberAccesses = accesses.filter((a) => a.memberId.equals(member._id));
            return {
                ...member,
                coffeeShopAccess: memberAccesses.map((a) => ({
                    coffeeShopId: a.coffeeShopId.toString(),
                    role: a.role,
                    permissions: a.permissions,
                })),
            };
        });
    }

    async updateMember(
        memberId: string,
        workspaceId: string,
        role: WorkspaceRoleKey,
        permissions: string[] = [],
        coffeeShopAccess?: SetShopAccessItem[],
    ) {
        const member = await this.workspaceMemberModel.findOne({ _id: memberId, workspaceId }).exec();
        if (!member) {
            throw new NotFoundException("Workspace member not found");
        }

        if (member.role === workspaceRoleKeys.owner) {
            throw new ForbiddenException("Cannot modify permissions of the OWNER.");
        }

        member.role = role;
        member.permissions = permissions;
        await member.save();

        if (coffeeShopAccess !== undefined) {
            await this.coffeeShopAccessService.setMemberShopAccess(memberId, coffeeShopAccess);
        }

        return member;
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
        await this.coffeeShopAccessService.deleteByMemberId(memberId);

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

    async updateInvitation(
        invitationId: string,
        workspaceId: string,
        role: WorkspaceRoleKey,
        permissions: string[],
        coffeeShopAccess?: SetShopAccessItem[],
    ) {
        const invitation = await this.invitationModel.findOne({ _id: invitationId, workspaceId }).exec();

        if (!invitation) {
            throw new NotFoundException("Invitation not found");
        }

        invitation.role = role;
        invitation.permissions = permissions;

        if (coffeeShopAccess !== undefined) {
            invitation.coffeeShopAccess = coffeeShopAccess.map((item) => ({
                coffeeShopId: new mongoose.Types.ObjectId(item.coffeeShopId),
                role: item.role,
                permissions: item.permissions || [],
            }));
        }

        return invitation.save();
    }

    async inviteUser(
        workspaceId: string,
        email: string,
        role: WorkspaceRoleKey,
        permissions: string[],
        invitedByUserId: string,
        coffeeShopAccess?: SetShopAccessItem[],
    ) {
        await this.checkMemberLimit(workspaceId);

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

            const member = await this.createMember(
                user._id.toString(),
                workspace._id.toString(),
                role,
                permissions,
            );

            if (coffeeShopAccess?.length) {
                await this.coffeeShopAccessService.setMemberShopAccess(String(member._id), coffeeShopAccess);
            }

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
                coffeeShopAccess:
                    coffeeShopAccess?.map((item) => ({
                        coffeeShopId: new mongoose.Types.ObjectId(item.coffeeShopId),
                        role: item.role,
                        permissions: item.permissions || [],
                    })) || [],
                token,
                status: "PENDING",
                invitedBy: new mongoose.Types.ObjectId(invitedByUserId),
            });

            const link = `${getEnv(envKeys.frontendBaseUrl)}/sign-in?email=${encodeURIComponent(normalizedEmail)}&token=${token}&mode=signup`;

            await sendMail({
                to: normalizedEmail,
                subject: `Запрошення до кав'ярні у робочому просторі ${workspace.name}`,
                html: invitationEmailHtml(link, workspace.name, normalizedEmail),
            });

            return { success: true, addedDirectly: false };
        }
    }
}
