import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, ValidateIf } from "class-validator";
import { expenseReportTypes, type ExpenseReportType } from "../enums/expense-report-type";

export class CreateExpenseReportDto {
    @IsString()
    title!: string;

    @IsNumber()
    amount!: number;

    @IsEnum(expenseReportTypes)
    type!: ExpenseReportType;

    @IsOptional()
    date?: Date;

    @IsOptional()
    validFrom?: Date;

    @IsOptional()
    validTo?: Date;

    @IsOptional()
    category?: string;

    @IsOptional()
    note?: string;

    @IsOptional()
    @ValidateIf((o: CreateExpenseReportDto) => !!o.receiptUrl)
    @IsUrl({ require_tld: false })
    receiptUrl?: string;
}
