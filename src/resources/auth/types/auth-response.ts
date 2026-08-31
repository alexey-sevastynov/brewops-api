import { type UserRoleKey } from "../../../resources/user/enums/user-role-key";

export interface AuthResponse {
    token: string;
    userId: string;
    userName: string;
    userRole?: UserRoleKey;
    isVerified: boolean;
    workspaceId?: string;
}
