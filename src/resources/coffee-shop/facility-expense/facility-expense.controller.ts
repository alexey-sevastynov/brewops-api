import { Controller, Get, Post, Delete, Body, Param, UsePipes, ValidationPipe, Patch } from "@nestjs/common";
import { FacilityExpenseService } from "./facility-expense.service";
import { CreateFacilityExpenseDto } from "./dto/create-facility-expense-dto";
import { UpdateFacilityExpenseDto } from "./dto/update-facility-expense-dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";
import { resourceNames } from "../../../common/constants/resource-names";
import { permissionActions } from "../../../common/enums/permission-action";

@Controller("coffee-shops/:coffeeShopId/facility-expenses")
export class FacilityExpenseController {
    constructor(private readonly service: FacilityExpenseService) {}

    @Get()
    @CheckPermission(resourceNames.facilityExpenses, permissionActions.read)
    findAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.findAllFacilityExpense(coffeeShopId);
    }

    @Get(":id")
    @CheckPermission(resourceNames.facilityExpenses, permissionActions.read)
    findById(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.findByIdFacilityExpense(id, coffeeShopId);
    }

    @Post()
    @CheckPermission(resourceNames.facilityExpenses, permissionActions.write)
    @UsePipes(new ValidationPipe())
    create(@Param("coffeeShopId") coffeeShopId: string, @Body() dto: CreateFacilityExpenseDto) {
        return this.service.createFacilityExpense(dto, coffeeShopId);
    }

    @Patch(":id")
    @CheckPermission(resourceNames.facilityExpenses, permissionActions.write)
    @UsePipes(new ValidationPipe())
    update(
        @Param("coffeeShopId") coffeeShopId: string,
        @Param("id") id: string,
        @Body() dto: UpdateFacilityExpenseDto,
    ) {
        return this.service.updateFacilityExpense(id, dto, coffeeShopId);
    }

    @Delete(":id")
    @CheckPermission(resourceNames.facilityExpenses, permissionActions.delete)
    delete(@Param("coffeeShopId") coffeeShopId: string, @Param("id") id: string) {
        return this.service.deleteFacilityExpense(id, coffeeShopId);
    }

    @Delete()
    @CheckPermission(resourceNames.facilityExpenses, permissionActions.delete)
    deleteAll(@Param("coffeeShopId") coffeeShopId: string) {
        return this.service.deleteAllFacilityExpenses(coffeeShopId);
    }
}
