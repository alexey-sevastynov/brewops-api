export const kavappInventoryTypes = {
    ingredient: "ingredient",
    cup: "cup",
    product: "product",
    kitchen: "kitchen",
};

export type KavappInventoryItemType = (typeof kavappInventoryTypes)[keyof typeof kavappInventoryTypes];
