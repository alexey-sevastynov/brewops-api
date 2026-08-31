export const workspacePlanKeys = {
    free: "free",
    pro: "pro",
    business: "business",
} as const;

export type WorkspacePlanKey = (typeof workspacePlanKeys)[keyof typeof workspacePlanKeys];
