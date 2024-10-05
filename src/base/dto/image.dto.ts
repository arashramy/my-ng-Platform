import { ApiProperty } from '@nestjs/swagger';

export class Image {
  @ApiProperty()
  data?: any;

  @ApiProperty()
  dataUrl?: string;

  @ApiProperty()
  height?: number;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  size?: number;

  @ApiProperty()
  width?: number;
}

export interface Media {
  name: string;
  url: string;
  size?: number;
}
