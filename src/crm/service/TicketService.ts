import { BadRequestException, Injectable } from '@nestjs/common';
import { TicketItem } from '../entities/TicketItem';
import { User } from '../../base/entities/User';
import { In, Like } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from '../entities/Ticket';
import { CreateTicketDto, TicketItemDto } from '../dto/ticket.dto';
import { WorkGroup } from '../../base/entities/WorkGroup';
import { Project } from '../../project-management/operational/entities/Project';
import { RELATIONS_KEY, createSortQuery } from '../../common/decorators/mvc.decorator';

@Injectable()
export class TicketService {
  async findAll(params: any, current: User, supporter = false) {
    let relationOptions: any = Reflect.getMetadata(RELATIONS_KEY, Ticket);
    relationOptions = relationOptions || {};
    params.limit ||= 10;
    params.offset ||= 0;
    const where: any = {};
    if (params.priority != undefined) {
      where.priority = params.priority;
    }
    if (params.status != undefined) {
      where.status = params.status;
    }

    if (params.project) {
      where.project = { id: +params.project };
    }

    if (params['project.equals']) {
      where.project = { id: +params['project.equals'] };
    }


    if (params['global.contains'] || params['global']) {
      where['subject'] = Like(
        `%${params['global.contains'] || params['global']}%`
      );
    }
    let qb;
    if (supporter) {
      const groups = [-1, ...current.groups.map((g) => g.id)].join(',');
      qb = `pos.id IN (${groups}) OR tpos.id IN (${groups})`;
    } else {
      qb = `q.user = ${current.id}`;
    }
    let query = Ticket.createQueryBuilder('q')
      .leftJoinAndSelect('q.user', 'user')
      .leftJoinAndSelect('q.group', 'group')
      .leftJoinAndSelect('q.project', 'project');
    if (supporter) {
      query
        .leftJoin('q.items', 'items')
        .leftJoin('items.group', 'pos')
        .leftJoin('items.targetGroup', 'tpos');
    }

    query.where(where).andWhere(qb);
    console.log(relationOptions)
    let sortMetaData = createSortQuery(Ticket, params, relationOptions);
    for (let s of sortMetaData) {
      query.addOrderBy(`${s.entity ? s.entity : 'q'}.${s.property}`, s.dir);
    }
    query.addOrderBy('q.id', 'DESC').addOrderBy('q.priority', 'DESC');
    let result = await query
      .offset(params.offset)
      .limit(params.limit)
      .getManyAndCount();
    return {
      total: result[1],
      content: result[0]
    };
  }

  async get(id: number, current: User) {
    let where: any;
    if (current.isAdmin()) {
      where = { id: id };
    } else {
      where = [
        {
          id: id,
          user: { id: current.id }
        },
        {
          id: id,
          items: {
            group: {
              id: In(current.groups.map((g) => g.id))
            }
          }
        },
        {
          id: id,
          items: {
            targetGroup: {
              id: In(current.groups.map((g) => g.id))
            }
          }
        }
      ];
    }
    return Ticket.findOne({
      where: where,
      relations: [
        'user',
        'group',
        'items',
        'items.group',
        'items.targetGroup',
        'items.user',
        'project'
      ],
      order: {
        items: {
          id: 'asc'
        }
      }
    });
  }

  async close(id: number, current: User) {
    if (await this.hasAccess(id, current)) {
      await Ticket.createQueryBuilder('q')
        .update()
        .set({
          secretData: null,
          status: TicketStatus.Closed
        })
        .where({
          id: id
        })
        .execute();
      return true;
    }
    throw new BadRequestException('Access denied');
  }

  async create(dto: CreateTicketDto, current: User) {
    let group = await WorkGroup.findOne({
      where: {
        id: dto.group,
        support: true
      }
    });

    if (!group) {
      throw new BadRequestException('Not found support group');
    }

    let project;

    if (dto.project) {
      project = await Project.findOne({ where: { id: +dto.project } });

      if (!project) {
        throw new BadRequestException('Not found project');
      }
    }

    let ticket = new Ticket();
    ticket.user = current;
    ticket.group = group;
    ticket.project = project;
    ticket.status = TicketStatus.Pending;
    ticket.subject = dto.subject;
    ticket.priority = dto.priority || TicketPriority.Low;
    ticket = await ticket.save();
    await this.addItem(
      {
        content: dto.content,
        attachments: dto.attachments,
        ticket: ticket,
        group: group.id
      },
      current
    );
    return ticket.id;
  }

  async addItem(dto: TicketItemDto, current: User) {
    let item = new TicketItem();
    item.content = dto.content;
    item.attachments = dto.attachments;
    item.user = current;
    if (dto.ticket instanceof Ticket) {
      item.ticket = dto.ticket;
    } else {
      if (!(await this.hasAccess(dto.ticket, current))) {
        throw new BadRequestException('Access denied');
      }
      item.ticket = await Ticket.findOne({
        where: { id: dto.ticket },
        relations: ['group']
      });
    }
    if ((item.ticket.user?.id || item.ticket.userId) == current.id) {
      item.group =
        item.ticket.group || ({ id: item.ticket?.groupId } as WorkGroup);
      item.ticket.status = TicketStatus.Pending;
      item.isAnswer = false;
    } else {
      if (dto.group && dto.group != item.ticket.groupId) {
        item.forward = true;
        item.ticket.status = TicketStatus.Pending;
        let group = await WorkGroup.findOne({
          where: {
            id: dto.group
          }
        });
        if (!group) {
          throw new BadRequestException('Access denied');
        }
        item.targetGroup = group;
        item.group = item.ticket.group;
      } else {
        item.group = item.ticket.group;
        item.forward = false;
        item.ticket.status = TicketStatus.Answered;
      }
      item.isAnswer = true;
    }
    await item.ticket.save();
    return item.save();
  }

  async rate(id: number, rate: number, current: User) {
    let item = await TicketItem.findOne({ where: { id: id } });
    if (!item) {
      throw new BadRequestException('Not found item');
    }
    if (
      (await Ticket.countBy({
        id: item.ticketId,
        user: { id: current.id }
      })) == 0
    ) {
      throw new BadRequestException('Access denied');
    }
    if (rate < 0 || rate > 5) {
      throw new BadRequestException('Invalid rate value');
    }

    item.rate = rate;
    await item.save();
    await Ticket.update(item.ticketId, {
      rate: () =>
        `(${TicketItem.createQueryBuilder('t')
          .select([])
          .addSelect('SUM(coalesce(t.rate,0))/COUNT(t.id)', 'rate')
          .where(`t.ticket=${item.ticketId} AND t.is_answer IS TRUE`)
          .groupBy('t.ticket')
          .getQuery()})`
    });
  }

  async hasAccess(id: number, current: User) {
    if (current.isAdmin()) {
      return true;
    }
    return (
      (await Ticket.count({
        where: [
          {
            id: id,
            user: {
              id: current.id
            }
          },
          {
            id: id,
            items: {
              group: {
                id: In(current.groups?.map((g) => g.id) || [])
              }
            }
          },
          {
            id: id,
            items: {
              targetGroup: {
                id: In(current.groups?.map((g) => g.id) || [])
              }
            }
          }
        ],
        relations: ['user', 'items', 'items.user']
      })) > 0
    );
  }
}
