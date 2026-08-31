import { type WorkspacePlanKey, workspacePlanKeys } from "../../resources/workspace/enums/workspace-plan-key";

export interface WorkspacePlanLimits {
    maxCoffeeShops: number;
    maxEmployees: number;
    historyDays: number;
}

export const workspacePlanLimits: Record<WorkspacePlanKey, WorkspacePlanLimits> = {
    [workspacePlanKeys.free]: {
        maxCoffeeShops: 1,
        maxEmployees: 5,
        historyDays: 30,
    },
    [workspacePlanKeys.pro]: {
        maxCoffeeShops: 5,
        maxEmployees: 25,
        historyDays: 365,
    },
    [workspacePlanKeys.business]: {
        maxCoffeeShops: Number.POSITIVE_INFINITY,
        maxEmployees: Number.POSITIVE_INFINITY,
        historyDays: Number.POSITIVE_INFINITY,
    },
};

export function getWorkspacePlanLimits(planKey: WorkspacePlanKey) {
    return workspacePlanLimits[planKey];
}
