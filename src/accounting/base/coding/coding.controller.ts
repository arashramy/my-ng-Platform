import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { AccountCodingService } from './coding.service';
import { CreateCoding } from './dtos/create-coding.dto';
import { UpdateCodingDTO } from './dtos/update-coding.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccountingCoding } from './coding.entity';

@ApiTags('accounting')
@Controller('/api/accounting/coding')
export class AccountCodingController {
  constructor(private readonly codingService: AccountCodingService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AccountingCoding,
  })
  createCoding(@Body() dto: CreateCoding) {
    return this.codingService.createCoding(dto);
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [AccountingCoding] })
  findAllCoding() {
    return this.codingService.findTrees();
  }

  @Delete(':id')
  @ApiResponse({ status: HttpStatus.OK })
  deleteCoding(@Param('id', ParseIntPipe) id: number) {
    return this.codingService.deleteCodingById(id);
  }

  @Patch(':id')
  @ApiResponse({ status: HttpStatus.OK })
  updateCoding(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCodingDTO,
  ) {
    return this.codingService.updateById(id, dto);
  }
}
