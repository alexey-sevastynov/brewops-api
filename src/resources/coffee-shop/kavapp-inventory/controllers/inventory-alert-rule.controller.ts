import { Controller, Get, Post, Patch, Delete, Body, Param, UsePipes, ValidationPipe } from "@nestjs/common";
import { InventoryAlertRuleService } from "../services/inventory-alert-rule.service";
import { CreateInventoryAlertRuleDto } from "../dto/create-inventory-alert-rule.dto";
import { UpdateInventoryAlertRuleDto } from "../dto/update-inventory-alert-rule.dto";
import { CheckPermission } from "../../../../resources/auth/decorators/check-permission.decorator";

@Controller("coffee-shops/:coffeeShopId/kavapp/alert-rules")
export class InventoryAlertRuleController {
    constructor(private readonly service: InventoryAlertRuleService) {}

    @Get()
    @CheckPermission("kavapp", "read")
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllInventoryAlertRules(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission("kavapp", "read")
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdInventoryAlertRule(id, coffeeShopId);
    }

    @Post()
    @CheckPermission("kavapp", "write")
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateInventoryAlertRuleDto) {
        return this.service.createInventoryAlertRule(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission("kavapp", "write")
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateInventoryAlertRuleDto,
    ) {
        return this.service.updateInventoryAlertRule(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission("kavapp", "delete")
    remove(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.removeInventoryAlertRule(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission("kavapp", "delete")
    removeAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.removeAllInventoryAlertRules(coffeeShopId);
    }
}
