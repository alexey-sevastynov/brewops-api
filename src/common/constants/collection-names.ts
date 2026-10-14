/**
 * TODO: Refactor collection name management.
 *
 * Collection names are duplicated here and in Mongoose model/schema definitions,
 * which can lead to inconsistencies when models or collection names change.
 *
 * Investigate a centralized approach to obtaining collection names from registered
 * Mongoose models or schema metadata, without introducing cross-module dependencies
 * or exposing internal schemas.
 *
 * Remove this constant if collection names can be reliably derived from existing
 * model registrations.
 */

export const collectionNames = {
    dailyReports: "dailyreports",
    employees: "employees",
    expenseReports: "expensereports",
    inventoryAudits: "inventoryaudits",
    facilityExpenses: "facilityexpenses",
    ownerWithdrawals: "ownerwithdrawals",
    kavappInventories: "kavappinventories",
    inventoryAlertRules: "inventoryalertrules",
    coffeeShops: "coffeeshops",
    workspaces: "workspaces",
    workspaceMembers: "workspacemembers",
    telegramMessageMappings: "telegrammessagemappings",
    workspaceInvitations: "workspaceinvitations",
    mailVerifications: "mailverifications",
    passwordResets: "passwordresets",
} as const;

export type CollectionName = (typeof collectionNames)[keyof typeof collectionNames];
