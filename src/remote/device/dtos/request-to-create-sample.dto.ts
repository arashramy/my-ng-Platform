import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export enum DeviceSampleType {
  FINGER_PRINT = 'FINGER_PRINT',
  CARD = 'CARD',
  FACE = 'FACE'
}

export class RequestToCreateSampleDTO {
  @IsNumber()
  @IsNotEmpty()
  deviceId: number;

  @IsNumber()
  @IsNotEmpty()
  userCode: number;

  @IsNotEmpty()
  @IsEnum(DeviceSampleType)
  type: DeviceSampleType;
}
