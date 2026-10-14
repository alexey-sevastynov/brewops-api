import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import mongoose, { type HydratedDocument, Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { collectionNames } from "../../common/constants/collection-names";
import { validateMongoId } from "../../common/validators/mongo-validator";
import { coffeeShopDataCollectionsToClean } from "../../common/constants/coffee-shop-data-collections";
import { errorMessages } from "../../common/constants/error-messages";
import { workspaceRoleKeys } from "../workspace-member/enums/workspace-role-key";
import { User } from "./user-schema";
import { CreateUserDto } from "./dto/create-user-dto";
import { UpdateUserDto } from "./dto/update-user-dto";
import { ensureUserExists, validateUserForCreate, validateUserForUpdate } from "./validators/user-validator";
import {
    sendAdminUserCreatedNotification,
    sendAdminUserDeletedNotification,
} from "./utils/user-email-notifications";

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
            return { success: false, message: errorMessages.notFound.replace("{0}", User.name) };
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
            .collection<WorkspaceMemberRecord>(collectionNames.workspaceMembers)
            .find({
                userId: { $in: userIdentifiers },
            })
            .toArray();

        const ownedMemberships = memberships.filter(
            (m) => m.role === workspaceRoleKeys.owner || m.role?.toLowerCase() === workspaceRoleKeys.owner,
        );

        for (const membership of ownedMemberships) {
            const workspaceId = membership.workspaceId;
            const wsIds: (mongoose.Types.ObjectId | string)[] = [workspaceId, workspaceId.toString()];
            if (mongoose.Types.ObjectId.isValid(workspaceId)) {
                wsIds.push(new mongoose.Types.ObjectId(workspaceId));
            }

            const coffeeShops = await db
                .collection<CoffeeShopRecord>(collectionNames.coffeeShops)
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

                for (const coffeeShopCollection of coffeeShopDataCollectionsToClean) {
                    await db.collection(coffeeShopCollection).deleteMany({
                        coffeeShopId: { $in: shopIds },
                    });
                }

                await db.collection(collectionNames.telegramMessageMappings).deleteMany({
                    resourceId: coffeeShopId.toString(),
                });
            }

            await db.collection(collectionNames.coffeeShops).deleteMany({
                workspaceId: { $in: wsIds },
            });

            await db.collection(collectionNames.workspaceInvitations).deleteMany({
                workspaceId: { $in: wsIds },
            });

            await db.collection(collectionNames.workspaceMembers).deleteMany({
                workspaceId: { $in: wsIds },
            });

            await db.collection(collectionNames.workspaces).deleteOne({
                _id: mongoose.Types.ObjectId.isValid(workspaceId)
                    ? new mongoose.Types.ObjectId(workspaceId)
                    : workspaceId,
            });
        }

        await db.collection(collectionNames.workspaceMembers).deleteMany({
            userId: { $in: userIdentifiers },
        });

        await db.collection(collectionNames.workspaceInvitations).deleteMany({
            $or: [{ email: userEmail }, { invitedBy: userObjectId }, { invitedBy: userObjectId.toString() }],
        });

        await db.collection(collectionNames.mailVerifications).deleteMany({
            userId: { $in: [userObjectId.toString(), userStringId] },
        });

        await db.collection(collectionNames.passwordResets).deleteMany({
            userId: { $in: [userObjectId.toString(), userStringId] },
        });

        await this.userModel.deleteOne({ _id: userObjectId }).exec();

        void sendAdminUserDeletedNotification({
            email: userEmail,
            userName,
            userId: userStringId,
            workspacesCount: ownedMemberships.length,
        });

        return { success: true, message: `User ${userEmail} and all associated data deleted successfully` };
    }
}
