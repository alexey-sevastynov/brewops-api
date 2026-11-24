import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import type { KavappInventoryItemType } from "../../../../integrations/kavapp/types/inventory/kavapp-inventory-item";
import { kavappInventoryItemTypes } from "../../../../integrations/kavapp/constants/kavapp-inventory";

export class CreateInventoryAlertRuleDto {
    @IsEnum(kavappInventoryItemTypes)
    itemType!: KavappInventoryItemType;

    @IsString()
    kavappItemId!: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    threshold?: number;

    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isIgnored?: boolean;

    @IsOptional()
    @IsString()
    description?: string;
}
