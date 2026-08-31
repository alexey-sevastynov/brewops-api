import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { FacilityExpenseService } from "./facility-expense.service";
import { CreateFacilityExpenseDto } from "./dto/create-facility-expense-dto";
import { UpdateFacilityExpenseDto } from "./dto/update-facility-expense-dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";

@Controller("coffee-shops/:coffeeShopId/facility-expenses")
export class FacilityExpenseController {
    constructor(private readonly service: FacilityExpenseService) {}

    @Get()
    @CheckPermission("facility-expenses", "read")
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllFacilityExpense(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission("facility-expenses", "read")
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdFacilityExpense(id, coffeeShopId);
    }

    @Post()
    @CheckPermission("facility-expenses", "write")
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateFacilityExpenseDto) {
        return this.service.createFacilityExpense(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission("facility-expenses", "write")
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateFacilityExpenseDto,
    ) {
        return this.service.updateFacilityExpense(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission("facility-expenses", "delete")
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.deleteFacilityExpense(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission("facility-expenses", "delete")
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.deleteAllFacilityExpenses(coffeeShopId);
    }
}
