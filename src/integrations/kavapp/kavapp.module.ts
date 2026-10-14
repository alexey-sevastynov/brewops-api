import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { KavappClient } from "./clients/kavapp.client";
import { KavappSalesClient } from "./clients/kavapp-sales.client";
import { KavappInventoryClient } from "./clients/kavapp-inventory.client";
import { KavappAuthClient } from "./clients/kavapp-auth.client";

@Module({
    imports: [
        HttpModule.register({
            timeout: 10_000,
        }),
    ],
    providers: [KavappClient, KavappAuthClient, KavappInventoryClient, KavappSalesClient],
    exports: [KavappClient],
})
export class KavappModule {}
