export const kavappInventoryTypes = {
    ingredient: "ingredient",
    cup: "cup",
    product: "product",
    kitchen: "kitchen",
} as const;

export type KavappInventoryItemType = (typeof kavappInventoryTypes)[keyof typeof kavappInventoryTypes];

export const kavappInventoryItemTypes = [
    kavappInventoryTypes.cup,
    kavappInventoryTypes.ingredient,
    kavappInventoryTypes.product,
    kavappInventoryTypes.kitchen,
] as const;

export const kavappInventoryLabels: Record<KavappInventoryItemType, string> = {
    ingredient: "Інгредієнти",
    cup: "Посуд",
    product: "Товари",
    kitchen: "Заготівлі",
};
