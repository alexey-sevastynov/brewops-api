export const permissionActions = {
    read: "read",
    write: "write",
    delete: "delete",
} as const;

export type PermissionAction = (typeof permissionActions)[keyof typeof permissionActions];
