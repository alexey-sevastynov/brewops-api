import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { KavappClient } from "./clients/kavapp.client";
import { KavappSalesClient } from "./clients/kavapp-sales.client";
import { KavappInventoryClient } from "./clients/kavapp-inventory.client";
import { KavappAuthClient } from "./clients/kavapp-auth.client";
import { KavappPriceClient } from "./clients/kavapp-price.client";

@Module({
    imports: [HttpModule.register({ timeout: 10_000 })],
    providers: [KavappClient, KavappAuthClient, KavappInventoryClient, KavappSalesClient, KavappPriceClient],
    exports: [KavappClient, KavappPriceClient],
})
export class KavappModule {}
