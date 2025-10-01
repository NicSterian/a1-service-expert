import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateExceptionDateDto } from './dto/create-exception-date.dto';
import { CreateExtraSlotDto } from './dto/create-extra-slot.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('exceptions')
  getExceptions() {
    return this.calendarService.getExceptionDates();
  }

  @Post('exceptions')
  createException(@Body() dto: CreateExceptionDateDto) {
    return this.calendarService.createExceptionDate(dto);
  }

  @Delete('exceptions/:id')
  deleteException(@Param('id', ParseIntPipe) id: number) {
    return this.calendarService.removeExceptionDate(id);
  }

  @Get('extra-slots')
  getExtraSlots(@Query('date') date?: string) {
    return this.calendarService.getExtraSlots(date);
  }

  @Post('extra-slots')
  createExtraSlot(@Body() dto: CreateExtraSlotDto) {
    return this.calendarService.createExtraSlot(dto);
  }

  @Delete('extra-slots/:id')
  deleteExtraSlot(@Param('id', ParseIntPipe) id: number) {
    return this.calendarService.removeExtraSlot(id);
  }

  @Post('bank-holidays/import')
  importBankHolidays() {
    return this.calendarService.importBankHolidays();
  }
}
