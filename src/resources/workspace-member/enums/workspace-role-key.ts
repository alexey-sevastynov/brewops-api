export const workspaceRoleKeys = {
    owner: "owner",
    admin: "admin",
    manager: "manager",
    barista: "barista",
} as const;

export type WorkspaceRoleKey = (typeof workspaceRoleKeys)[keyof typeof workspaceRoleKeys];

export const workspaceManagementRoles: readonly WorkspaceRoleKey[] = [
    workspaceRoleKeys.owner,
    workspaceRoleKeys.admin,
];
