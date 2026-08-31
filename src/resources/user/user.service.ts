import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "./user-schema";
import mongoose, { type HydratedDocument, Model } from "mongoose";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { validateMongoId } from "../../common/validators/mongo-validator";
import { ensureUserExists, validateUserForCreate, validateUserForUpdate } from "./validators/user-validator";
import * as bcrypt from "bcryptjs";
import {
    sendAdminUserCreatedNotification,
    sendAdminUserDeletedNotification,
} from "./utils/user-email-notifications";
import { workspaceRoleKeys } from "../workspace-member/enums/workspace-role-key";

interface WorkspaceMemberRecord {
    _id: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId | string;
    role: string;
}

interface CoffeeShopRecord {
    _id: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId | string;
}

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {}

    findAllUser() {
        return this.userModel.find().exec();
    }

    async findByIdUser(id: string) {
        validateMongoId(id, User.name);
        return ensureUserExists(this.userModel, id);
    }

    async createUser(userDto: CreateUserDto) {
        await validateUserForCreate(this.userModel, userDto);
        const hashedPassword = await bcrypt.hash(userDto.password, 10);

        const newUser = new this.userModel({
            ...userDto,
            password: hashedPassword,
        });

        const createdUser = await newUser.save();

        void sendAdminUserCreatedNotification({
            email: createdUser.email,
            userName: createdUser.userName,
            userId: createdUser.userId,
            firstName: createdUser.firstName,
            lastName: createdUser.lastName,
            phoneNumber: createdUser.phoneNumber,
        });

        return createdUser;
    }

    async updateUser(id: string, user: UpdateUserDto) {
        validateMongoId(id, User.name);
        await ensureUserExists(this.userModel, id);
        await validateUserForUpdate(this.userModel, id, user);

        const updatedData = { ...user };
        if (user.password) {
            updatedData.password = await bcrypt.hash(user.password, 10);
        }

        return this.userModel.findByIdAndUpdate(id, updatedData, { new: true }).exec();
    }

    async partialUpdateUser(id: string, user: Partial<UpdateUserDto>) {
        validateMongoId(id, User.name);
        await ensureUserExists(this.userModel, id);
        await validateUserForUpdate(this.userModel, id, user);

        const updatedData = { ...user };
        if (user.password) {
            updatedData.password = await bcrypt.hash(user.password, 10);
        }

        return this.userModel.findByIdAndUpdate(id, updatedData, { new: true }).exec();
    }

    async deleteUser(idOrEmail: string) {
        return this.cascadeDeleteUser(idOrEmail);
    }

    async deleteAllUsers() {
        const users = await this.userModel.find().exec();
        for (const user of users) {
            await this.cascadeDeleteUser(user.id as string);
        }

        return { deletedCount: users.length };
    }

    async updateProfile(userId: string, dto: Partial<UpdateUserDto>) {
        await ensureUserExists(this.userModel, userId);
        await validateUserForUpdate(this.userModel, userId, dto);

        const updatedData = { ...dto };
        if (dto.password) {
            updatedData.password = await bcrypt.hash(dto.password, 10);
        }

        return this.userModel.findByIdAndUpdate(userId, updatedData, { new: true }).exec();
    }

    async deleteAccount(userId: string) {
        return this.cascadeDeleteUser(userId);
    }

    async cascadeDeleteUser(identifier: string) {
        let user: HydratedDocument<User> | null = null;
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            user = await this.userModel.findById(identifier).exec();
        }
        if (!user) {
            user = await this.userModel
                .findOne({
                    $or: [{ email: identifier.toLowerCase().trim() }, { userId: identifier }],
                })
                .exec();
        }

        if (!user) {
            return { success: false, message: "User not found" };
        }

        const db = this.userModel.db;
        const userObjectId = user._id;
        const userStringId = user.userId;
        const userEmail = user.email.toLowerCase().trim();
        const userName = user.userName;

        const userIdentifiers: (mongoose.Types.ObjectId | string)[] = [
            userObjectId,
            userObjectId.toString(),
            userStringId,
        ];

        // 1. Find all memberships for this user
        const memberships = await db
            .collection<WorkspaceMemberRecord>("workspacemembers")
            .find({
                userId: { $in: userIdentifiers },
            })
            .toArray();

        // 2. Identify workspaces owned by this user (case-insensitive check for owner/OWNER)
        const ownedMemberships = memberships.filter(
            (m) =>
                m.role === workspaceRoleKeys.owner ||
                m.role?.toLowerCase() === workspaceRoleKeys.owner ||
                m.role === "OWNER",
        );

        for (const membership of ownedMemberships) {
            const workspaceId = membership.workspaceId;
            const wsIds: (mongoose.Types.ObjectId | string)[] = [workspaceId, workspaceId.toString()];
            if (mongoose.Types.ObjectId.isValid(workspaceId)) {
                wsIds.push(new mongoose.Types.ObjectId(workspaceId));
            }

            // Find all coffee shops of this workspace
            const coffeeShops = await db
                .collection<CoffeeShopRecord>("coffeeshops")
                .find({
                    workspaceId: { $in: wsIds },
                })
                .toArray();

            for (const shop of coffeeShops) {
                const coffeeShopId = shop._id;
                const shopIds: (mongoose.Types.ObjectId | string)[] = [coffeeShopId, coffeeShopId.toString()];
                if (mongoose.Types.ObjectId.isValid(coffeeShopId)) {
                    shopIds.push(new mongoose.Types.ObjectId(coffeeShopId));
                }

                const collectionsToClean = [
                    "dailyreports",
                    "employees",
                    "expensereports",
                    "inventoryaudits",
                    "facilityexpenses",
                    "ownerwithdrawals",
                    "kavappinventories",
                    "inventoryalertrules",
                ];

                for (const colName of collectionsToClean) {
                    await db.collection(colName).deleteMany({
                        coffeeShopId: { $in: shopIds },
                    });
                }

                await db.collection("telegrammessagemappings").deleteMany({
                    resourceId: coffeeShopId.toString(),
                });
            }

            // Delete all coffee shops of workspace
            await db.collection("coffeeshops").deleteMany({
                workspaceId: { $in: wsIds },
            });

            // Delete all workspace invitations for this workspace
            await db.collection("workspaceinvitations").deleteMany({
                workspaceId: { $in: wsIds },
            });

            // Delete all members of this workspace
            await db.collection("workspacemembers").deleteMany({
                workspaceId: { $in: wsIds },
            });

            // Delete the workspace itself
            await db.collection("workspaces").deleteOne({
                _id: mongoose.Types.ObjectId.isValid(workspaceId)
                    ? new mongoose.Types.ObjectId(workspaceId)
                    : workspaceId,
            });
        }

        // 3. Delete user's membership in any other workspaces
        await db.collection("workspacemembers").deleteMany({
            userId: { $in: userIdentifiers },
        });

        // 4. Delete invitations sent to user or invited by user
        await db.collection("workspaceinvitations").deleteMany({
            $or: [{ email: userEmail }, { invitedBy: userObjectId }, { invitedBy: userObjectId.toString() }],
        });

        // 5. Clean verification/reset tokens
        await db.collection("mailverifications").deleteMany({
            userId: { $in: [userObjectId.toString(), userStringId] },
        });

        await db.collection("passwordresets").deleteMany({
            userId: { $in: [userObjectId.toString(), userStringId] },
        });

        // 6. Delete the user
        await this.userModel.deleteOne({ _id: userObjectId }).exec();

        // 7. Send notification to admin
        void sendAdminUserDeletedNotification({
            email: userEmail,
            userName,
            userId: userStringId,
            workspacesCount: ownedMemberships.length,
        });

        return { success: true, message: `User ${userEmail} and all associated data deleted successfully` };
    }
}
