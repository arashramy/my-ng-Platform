import { Body, Controller, Inject, Patch, Query } from '@nestjs/common';
import { ILockerManagerService } from '../locker-manager-service';
import { ISingleLockerType } from '../types/single-locker.interface';

@Controller('/api/locker-manager')
export class LockerManagerController {
  @Inject('LockerManagerService')
  private readonly service: ILockerManagerService;

  @Patch('/toggle')
  allLockerManager(@Body() { data }: { data: ISingleLockerType[] }) {
    console.log('salam');
    return this.service.singleLockerManager(data);
  }

  @Patch('all')
  singleLockerManager(
    @Query('id') id: number,
    @Query('toggle') toggle: number
  ) {
    console.log('queery', id, toggle);
    return this.service.allLockerManager(toggle, id);
  }
}
