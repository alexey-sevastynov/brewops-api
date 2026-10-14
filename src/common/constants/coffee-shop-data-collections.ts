import { collectionNames } from "./collection-names";

export const coffeeShopDataCollectionsToClean = [
    collectionNames.dailyReports,
    collectionNames.employees,
    collectionNames.expenseReports,
    collectionNames.inventoryAudits,
    collectionNames.facilityExpenses,
    collectionNames.ownerWithdrawals,
    collectionNames.kavappInventories,
    collectionNames.inventoryAlertRules,
] as const;
