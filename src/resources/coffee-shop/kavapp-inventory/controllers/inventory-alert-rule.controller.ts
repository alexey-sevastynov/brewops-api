import { Body, Controller, Delete, Get, Param, Patch, Post, UsePipes, ValidationPipe } from "@nestjs/common";
import { Roles } from "../../../../common/auth/decorators/roles.decorator";
import { authorizedRoles } from "../../../../common/auth/constants/authorized-roles";
import { CreateInventoryAlertRuleDto } from "../dto/create-inventory-alert-rule.dto";
import { UpdateInventoryAlertRuleDto } from "../dto/update-inventory-alert-rule.dto";
import { InventoryAlertRuleService } from "../services/inventory-alert-rule.service";

@Roles(...authorizedRoles.coffeeShop)
@Controller("coffee-shop/kavapp/alert-rules")
export class InventoryAlertRuleController {
    constructor(private readonly service: InventoryAlertRuleService) {}

    @Get()
    findAll() {
        return this.service.findAllInventoryAlertRules();
    }

    @Get(":id")
    findById(@Param("id") id: string) {
        return this.service.findByIdInventoryAlertRule(id);
    }

    @Post()
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    create(@Body() dto: CreateInventoryAlertRuleDto) {
        return this.service.createInventoryAlertRule(dto);
    }

    @Patch(":id")
    @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
    update(@Param("id") id: string, @Body() dto: UpdateInventoryAlertRuleDto) {
        return this.service.updateInventoryAlertRule(id, dto);
    }

    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.service.removeInventoryAlertRule(id);
    }

    @Delete()
    removeAll() {
        return this.service.removeAllInventoryAlertRules();
    }
}
