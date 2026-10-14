import { type WorkspacePlanKey, workspacePlanKeys } from "../../resources/workspace/enums/workspace-plan-key";

export interface WorkspacePlanLimits {
    maxCoffeeShops: number;
    maxEmployees: number;
    maxMembers: number;
    historyDays: number;
    allowKavappIntegration: boolean;
    allowTelegramIntegration: boolean;
}

export const workspacePlanLimits: Record<WorkspacePlanKey, WorkspacePlanLimits> = {
    [workspacePlanKeys.free]: {
        maxCoffeeShops: 1,
        maxEmployees: 5,
        maxMembers: 3,
        historyDays: 30,
        allowKavappIntegration: false,
        allowTelegramIntegration: false,
    },
    [workspacePlanKeys.pro]: {
        maxCoffeeShops: 5,
        maxEmployees: 25,
        maxMembers: 10,
        historyDays: 365,
        allowKavappIntegration: true,
        allowTelegramIntegration: true,
    },
    [workspacePlanKeys.business]: {
        maxCoffeeShops: Number.POSITIVE_INFINITY,
        maxEmployees: Number.POSITIVE_INFINITY,
        maxMembers: Number.POSITIVE_INFINITY,
        historyDays: Number.POSITIVE_INFINITY,
        allowKavappIntegration: true,
        allowTelegramIntegration: true,
    },
};

export function getWorkspacePlanLimits(planKey: WorkspacePlanKey) {
    return workspacePlanLimits[planKey];
}
