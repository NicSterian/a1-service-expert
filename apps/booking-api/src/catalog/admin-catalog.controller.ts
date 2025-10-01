import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CatalogService } from './catalog.service';
import { CreateEngineTierDto } from './dto/create-engine-tier.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateEngineTierDto } from './dto/update-engine-tier.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpsertServicePriceDto } from './dto/upsert-service-price.dto';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('services')
  getServices() {
    return this.catalogService.getAllServices();
  }

  @Post('services')
  createService(@Body() dto: CreateServiceDto) {
    return this.catalogService.createService(dto);
  }

  @Patch('services/:id')
  updateService(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServiceDto) {
    return this.catalogService.updateService(id, dto);
  }

  @Delete('services/:id')
  deleteService(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.deleteService(id);
  }

  @Get('engine-tiers')
  getEngineTiers() {
    return this.catalogService.getEngineTiers();
  }

  @Post('engine-tiers')
  createEngineTier(@Body() dto: CreateEngineTierDto) {
    return this.catalogService.createEngineTier(dto);
  }

  @Patch('engine-tiers/:id')
  updateEngineTier(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEngineTierDto) {
    return this.catalogService.updateEngineTier(id, dto);
  }

  @Delete('engine-tiers/:id')
  deleteEngineTier(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.deleteEngineTier(id);
  }

  @Get('prices')
  getServicePrices() {
    return this.catalogService.getServicePrices(true);
  }

  @Put('prices')
  upsertServicePrice(@Body() dto: UpsertServicePriceDto) {
    return this.catalogService.upsertServicePrice(dto);
  }

  @Delete('prices/:id')
  deleteServicePrice(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.deleteServicePrice(id);
  }
}
