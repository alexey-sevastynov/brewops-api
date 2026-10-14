export const kavappInventoryTypes = {
    ingredient: "ingredient",
    cup: "cup",
    product: "product",
    kitchen: "kitchen",
} as const;

export type KavappInventoryItemType = (typeof kavappInventoryTypes)[keyof typeof kavappInventoryTypes];
