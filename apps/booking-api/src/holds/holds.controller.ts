import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldsService } from './holds.service';

@Controller('holds')
export class HoldsController {
  constructor(private readonly holdsService: HoldsService) {}

  @Post()
  create(@Body() dto: CreateHoldDto) {
    return this.holdsService.createHold(dto.date, dto.time);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.holdsService.releaseHold(id);
    return { ok: true };
  }
}
