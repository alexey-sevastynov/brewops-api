export const inventoryAlertStates = {
    none: "none",
    lowStock: "lowStock",
    negative: "negative",
} as const;

export type InventoryAlertState = (typeof inventoryAlertStates)[keyof typeof inventoryAlertStates];
