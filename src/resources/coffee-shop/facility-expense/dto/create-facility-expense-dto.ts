import { IsDate, IsNumber, IsOptional, IsString, IsUrl, ValidateIf } from "class-validator";
import { Type } from "class-transformer";

export class CreateFacilityExpenseDto {
    @IsString()
    title!: string;

    @IsNumber()
    amount!: number;

    @IsDate()
    @Type(() => Date)
    date!: Date;

    @IsDate()
    @Type(() => Date)
    period!: Date;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @ValidateIf((o: CreateFacilityExpenseDto) => !!o.receiptUrl)
    @IsUrl({ require_tld: false })
    receiptUrl?: string;
}
