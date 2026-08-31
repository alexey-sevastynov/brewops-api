import { IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class CreateCoffeeShopDto {
    @IsNotEmpty()
    @IsString()
    @Length(1, 100)
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    address?: string;

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
