import { type UserRoleKey } from "../../../resources/user/enums/user-role-key";

export type AuthenticatedUser = {
    mongoId: string;
    userId: string;
    userName: string;
    isVerified: boolean;
    userRole?: UserRoleKey;
    workspaceId?: string;
    workspaceRole?: string;
};
