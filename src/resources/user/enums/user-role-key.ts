export const userRoleKeys = {
    admin: "admin",
    user: "user",
    manager: "manager",
} as const;

export type UserRoleKey = (typeof userRoleKeys)[keyof typeof userRoleKeys];
