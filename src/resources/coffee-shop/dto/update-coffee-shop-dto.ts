import { IsBoolean, IsOptional, IsString, Length } from "class-validator";

export class UpdateCoffeeShopDto {
    @IsOptional()
    @IsString()
    @Length(1, 100)
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsString()
    telegramChatId?: string;

    @IsOptional()
    @IsString()
    kavappEmail?: string;

    @IsOptional()
    @IsString()
    kavappPassword?: string;

    @IsOptional()
    @IsString()
    kavappPointId?: string;
}
