import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Employee, EmployeeSchema } from "../employee/employee-schema";
import { KavappSalesModule } from "../kavapp-sales/kavapp-sales.module";
import { DailyReportService } from "./daily-report.service";
import { DailyReportController } from "./daily-report.controller";
import { DailyReport, DailyReportSchema } from "./daily-report-schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: DailyReport.name, schema: DailyReportSchema },
            { name: Employee.name, schema: EmployeeSchema },
        ]),
        KavappSalesModule,
    ],
    controllers: [DailyReportController],
    providers: [DailyReportService],
    exports: [DailyReportService],
})
export class DailyReportModule {}
