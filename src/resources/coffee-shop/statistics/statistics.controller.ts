import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { StatisticsService } from "./statistics.service";
import { GetStatisticsDto } from "./dto/get-statistics.dto";
import { CheckPermission } from "../../../resources/auth/decorators/check-permission.decorator";

@ApiTags("Statistics")
@Controller("coffee-shops/:coffeeShopId/statistics")
export class StatisticsController {
    constructor(private readonly statisticsService: StatisticsService) {}

    @Get()
    @CheckPermission("statistics", "read")
    @ApiOperation({ summary: "Get aggregated statistics for a specific period" })
    @ApiResponse({ status: 200, description: "Returns aggregated statistics." })
    getStatistics(@Param("coffeeShopId") coffeeShopId: string, @Query() query: GetStatisticsDto) {
        return this.statisticsService.getStatistics(coffeeShopId, query);
    }
}
