import {BadRequestException, Body, Controller, Get, Param, Post, Put, Query, UseGuards} from "@nestjs/common";
import {CurrentUser} from "../../auth/decorators/current-user.decorator";
import {AccessTokenGuard} from "../../auth/guard/access-token.guard";
import {TicketService} from "../service/TicketService";
import {User} from "../../base/entities/User";
import {Ticket} from "../entities/Ticket";
import {CreateTicketDto, TicketItemDto} from "../dto/ticket.dto";

@UseGuards(AccessTokenGuard)
@Controller('/api/tickets')
export class TicketController {
  constructor(private service: TicketService) {
  }

  @Get('/my')
  getOwnTickets(@Query() params: any, @CurrentUser() current: User) {
    return this.service.findAll(params, current, false);
  }

  @Get('/support')
  getSupporterTickets(@Query() params: any, @CurrentUser() current: User) {
    return this.service.findAll(params, current, true);
  }

  @Get("/:id")
  get(@Param('id') id: number, @CurrentUser() current: User) {
    return this.service.get(id, current);
  }

  @Put('/secret-data/:id')
  async addSecretData(@Param('id') id: number, @Body() body: any, @CurrentUser() current: User) {
    if (!(await this.service.hasAccess(id, current))) {
      throw new BadRequestException('Not found ticket');
    }
    await Ticket.update(id, {
      secretData: body.data,
      updatedAt: new Date()
    });
    return true;
  }

  @Put('/close/:id')
  async close(@Param('id') id: number, @CurrentUser() current: User) {
    return this.service.close(id, current);
  }

  @Post('/new')
  async newTicket(@Body() body: CreateTicketDto, @CurrentUser() current: User) {
    return this.service.create(body, current);
  }

  @Put('/answer/:id')
  async answer(@Param('id') id: number, @Body() body: TicketItemDto,
               @CurrentUser({transient: false}) current: User) {
    body.ticket = id;
    return this.service.addItem(body, current);
  }

  @Put('/rate/:id')
  async addRate(@Param('id') id: number, @Body() {rate}: any, @CurrentUser() current: User) {
    return this.service.rate(id, rate, current);
  }
}
