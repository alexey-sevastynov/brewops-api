import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./infra/database/database.module";
import { AiModule } from "./infra/ai/ai.module";
import { TaskModule } from "./resources/task/task.module";
import { UserModule } from "./resources/user/user.module";
import { AuthModule } from "./resources/auth/auth.module";
import { PasswordResetModule } from "./resources/password-reset/password-reset.module";
import { EmployeeModule } from "./resources/coffee-shop/employee/employee.module";
import { DailyReportModule } from "./resources/coffee-shop/daily-report/daily-report.module";
import { ExpenseReportModule } from "./resources/coffee-shop/expense-report/expense-report.module";
import { InventoryAuditModule } from "./resources/coffee-shop/inventory-audit/inventory-audit.module";
import { StatisticsModule } from "./resources/coffee-shop/statistics/statistics.module";
import { FacilityExpenseModule } from "./resources/coffee-shop/facility-expense/facility-expense.module";
import { OwnerWithdrawalModule } from "./resources/coffee-shop/owner-withdrawal/owner-withdrawal.module";
import { TelegramModule } from "./infra/telegram/telegram.module";
import { KavappInventoryModule } from "./resources/coffee-shop/kavapp-inventory/kavapp-inventory.module";
import { WorkspaceModule } from "./resources/workspace/workspace.module";
import { WorkspaceMemberModule } from "./resources/workspace-member/workspace-member.module";
import { CoffeeShopModule } from "./resources/coffee-shop/coffee-shop.module";
import { CoffeeShopAccessModule } from "./resources/coffee-shop-access/coffee-shop-access.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        AiModule,
        TelegramModule,
        TaskModule,
        UserModule,
        AuthModule,
        PasswordResetModule,
        EmployeeModule,
        DailyReportModule,
        ExpenseReportModule,
        InventoryAuditModule,
        StatisticsModule,
        FacilityExpenseModule,
        OwnerWithdrawalModule,
        KavappInventoryModule,
        WorkspaceModule,
        WorkspaceMemberModule,
        CoffeeShopModule,
        CoffeeShopAccessModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
