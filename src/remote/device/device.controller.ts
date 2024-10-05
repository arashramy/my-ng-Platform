import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { DeviceService } from './device.service';
import { RemoteDeviceProcess, RequestToCreateSampleDTO } from './dtos';

@Controller('/api/remote/device')
export class DeviceController {
  @Inject(DeviceService)
  private readonly deviceService: DeviceService;

  @Post()
  executeProcess(@Body() body: RemoteDeviceProcess) {
    console.log('execute process');
    return this.deviceService.handleExecutingProcess(body);
  }

  @Post('request')
  async requestToCreateSample(@Body() body: RequestToCreateSampleDTO) {
    return this.deviceService.requestToCreateSample(body);
  }

  @Get('unableToReception')
  async unableToReception(@Query('userId') userId: string, @Query('deviceCode') deviceCode: string) {    
    return this.deviceService.unableToReception(userId, deviceCode);
  }
}
