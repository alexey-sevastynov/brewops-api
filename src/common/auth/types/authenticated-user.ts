import { type UserRoleKey } from "../../../resources/user/enums/user-role-key";

export type AuthenticatedUser = {
    mongoId: string;
    userId: string;
    userName: string;
    userRole?: UserRoleKey;
    isVerified: boolean;
    workspaceId?: string;
    workspaceRole?: string;
};
