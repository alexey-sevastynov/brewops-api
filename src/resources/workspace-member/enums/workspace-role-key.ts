export const workspaceRoleKeys = {
    owner: "owner",
    admin: "admin",
    custom: "custom",
} as const;

export type WorkspaceRoleKey = (typeof workspaceRoleKeys)[keyof typeof workspaceRoleKeys];

export const workspaceManagementRoles: readonly WorkspaceRoleKey[] = [
    workspaceRoleKeys.owner,
    workspaceRoleKeys.admin,
];
