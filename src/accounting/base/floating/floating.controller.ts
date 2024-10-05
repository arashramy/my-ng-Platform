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
import { AccountFloatingService } from './services/floating.service';
import { CreateFloatingDTO } from './dtos/create-floating.dto';
import { UpdateCodingDTO } from '../coding/dtos/update-coding.dto';
import { CreateFloatingItemDTO } from './dtos/create-floating-item.dto';
import { AccountFloatingItemService } from './services/floating-item.service';
import { UpdateFloatingItemDTO } from './dtos/update-floating-item.dto';
import { FindAllFloatingParamDTO } from './dtos/FindAllFloatingParam.dto';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccountingFloating, FloatingType } from './entities/floating.entity';
import { AccountingFloatingItem } from './entities/floating-item.entity';

@ApiTags('accounting')
@Controller('/api/accounting/floating')
export class AccountFloatingController {
  constructor(
    private readonly floatingService: AccountFloatingService,
    private readonly floatingItemService: AccountFloatingItemService,
  ) {}

  @Post('/items')
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: AccountingFloatingItem,
  })
  createFloatingItem(@Body() dto: CreateFloatingItemDTO) {
    return this.floatingItemService.create(dto);
  }

  @Get('/items/:type')
  @ApiResponse({
    status: HttpStatus.OK,
    type: [AccountingFloatingItem],
  })
  getFloatingItems(@Param() params: FindAllFloatingParamDTO) {
    return this.floatingItemService.getItems(params.type);
  }

  @Delete('/items/:id')
  @ApiResponse({ status: HttpStatus.OK })
  deleteFloatingItemsById(@Param('id', ParseIntPipe) id: number) {
    return this.floatingItemService.delete(id);
  }

  @Patch('/items/:id')
  @ApiResponse({ status: HttpStatus.OK })
  updateFloatingItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFloatingItemDTO,
  ) {
    return this.floatingItemService.update(id, dto);
  }

  @Post()
  @ApiResponse({ status: HttpStatus.CREATED, type: AccountingFloating })
  createFloating(@Body() dto: CreateFloatingDTO) {
    return this.floatingService.create(dto);
  }

  @Delete(':id')
  @ApiResponse({ status: HttpStatus.OK })
  deleteFloating(@Param('id', ParseIntPipe) id: number) {
    return this.floatingService.deleteById(id);
  }

  @Patch(':id')
  @ApiResponse({ status: HttpStatus.OK })
  @ApiParam({ name: 'id', type: Number })
  updateFloating(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCodingDTO,
  ) {
    return this.floatingService.update(id, dto);
  }

  @Get(':type')
  @ApiResponse({ status: HttpStatus.OK, type: [AccountingFloating] })
  @ApiParam({ name: 'type', enum: FloatingType })
  selectAllFloating(@Param() params: FindAllFloatingParamDTO) {
    return this.floatingService.selectAll(params.type);
  }
}
