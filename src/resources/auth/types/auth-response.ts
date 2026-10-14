import { type UserRoleKey } from "../../../resources/user/enums/user-role-key";

export interface AuthResponse {
    token: string;
    userId: string;
    userName: string;
    isVerified: boolean;
    userRole?: UserRoleKey;
    workspaceId?: string;
}
