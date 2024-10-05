import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseFilePipe,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors
} from '@nestjs/common';
import { Express, Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { storage } from '../../common/multer/storage.engine';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

// @UseGuards(AccessTokenGuard)
@Controller('/api/media')
export class MediaController {
  @Post('/upload')
  @UseInterceptors(FileInterceptor('file', { storage: storage }))
  async upload(@UploadedFile(new ParseFilePipe()) file: Express.Multer.File) {
    return { filename: file.filename };
  }

  @Post('/uploads')
  @UseInterceptors(FilesInterceptor('file[]', 10, { storage: storage }))
  async uploads(
    @UploadedFiles(new ParseFilePipe()) files: Array<Express.Multer.File>
  ) {
    return files.map((file) => file.filename);
  }

  @Get('/:name')
  @Header('Cache-Control', 'max-age=36000')
  getFile(@Param('name') name: string, @Res() res: Response) {
    if (existsSync(join(process.env.MEDIA_PATH, name))) {
      const file = createReadStream(join(process.env.MEDIA_PATH, name));
      file.pipe(res);
      return;
    }
    throw new NotFoundException('File not found');
  }
}
