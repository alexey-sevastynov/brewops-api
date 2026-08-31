import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { InventoryAuditService } from "./inventory-audit.service";
import { CreateInventoryAuditDto } from "./dto/create-inventory-audit-dto";
import { UpdateInventoryAuditDto } from "./dto/update-inventory-audit-dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";

@Controller("coffee-shops/:coffeeShopId/inventory-audits")
export class InventoryAuditController {
    constructor(private readonly service: InventoryAuditService) {}

    @Get()
    @CheckPermission("inventory-audits", "read")
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllInventoryAudit(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission("inventory-audits", "read")
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdInventoryAudit(id, coffeeShopId);
    }

    @Post()
    @CheckPermission("inventory-audits", "write")
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateInventoryAuditDto) {
        return this.service.createInventoryAudit(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission("inventory-audits", "write")
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateInventoryAuditDto,
    ) {
        return this.service.updateInventoryAudit(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission("inventory-audits", "delete")
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.deleteInventoryAudit(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission("inventory-audits", "delete")
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.deleteAllInventoryAudits(coffeeShopId);
    }
}
