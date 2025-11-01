import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { VehiclesService } from '../vehicles/vehicles.service';

class DvlaTestDto {
  registration: string;
}

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/dvla')
export class DvlaTestController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post('test-lookup')
  async testLookup(@Body() dto: DvlaTestDto) {
    return this.vehiclesService.lookupVrm({ vrm: dto.registration });
  }
}
