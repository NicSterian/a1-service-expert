import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VrmLookupRateLimitGuard } from '../rate-limit/vrm-lookup-rate-limit.guard';
import { RecommendEngineTierDto } from './dto/recommend-engine-tier.dto';
import { VehicleLookupDto } from './dto/vehicle-lookup.dto';
import { VehicleLookupQueryDto } from './dto/vehicle-lookup-query.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get('vrm/:vrm')
  @UseGuards(VrmLookupRateLimitGuard)
  lookupByVrm(
    @Param('vrm') vrm: string,
    @Query() query: VehicleLookupQueryDto,
  ) {
    const dto: VehicleLookupDto = {
      vrm,
      serviceId: query.serviceId,
    };

    return this.vehiclesService.lookupVrm(dto, { dryRun: query.dryRun });
  }

  @Post('vrm')
  @UseGuards(VrmLookupRateLimitGuard)
  lookup(@Body() dto: VehicleLookupDto) {
    // Basic shape check to avoid noisy validation errors
    if (!dto || typeof dto.vrm !== 'string' || dto.vrm.trim().length < 2) {
      return {
        ok: false,
        allowManual: true,
        ...(process.env.NODE_ENV !== 'production' && {
          reason: 'Invalid request: vrm must be a non-empty string',
        }),
      };
    }
    return this.vehiclesService.lookupVrm(dto);
  }

  @Post('recommend-tier')
  recommend(@Body() dto: RecommendEngineTierDto) {
    return this.vehiclesService.recommendEngineTier(
      dto.serviceId,
      dto.engineSizeCc,
    );
  }
}
