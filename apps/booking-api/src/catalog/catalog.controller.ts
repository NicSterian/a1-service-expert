import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  getCatalogSummary() {
    return this.catalogService.getCatalogSummary();
  }

  @Get('services')
  getServices() {
    return this.catalogService.getServices();
  }

  @Get('engine-tiers')
  getEngineTiers() {
    return this.catalogService.getEngineTiers();
  }

  @Get('prices')
  getServicePrices() {
    return this.catalogService.getServicePrices();
  }
}
