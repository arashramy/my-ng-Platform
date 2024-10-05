import {
    Controller,
    Get,
    Header,
    Param,
    ParseFilePipe,
    Post,
    Res,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import {AccessTokenGuard} from "../../auth/guard/access-token.guard";
import {FaceApiService} from "../service/FaceApiService";
import {FileInterceptor, FilesInterceptor} from "@nestjs/platform-express";
import {Express, Response} from "express";
import {AuthService} from "../../auth/service/auth.service";
import {createReadStream} from "fs";
import {join} from "path";


@Controller('/api/face')
export class FaceApiController {

    constructor(private faceService: FaceApiService,
                private authService: AuthService) {
    }

    @Post("/check")
    @UseInterceptors(FileInterceptor('file'))
    async check(@UploadedFile(new ParseFilePipe()) file: Express.Multer.File) {
        let detects: any = await this.faceService.getDescriptors(file.buffer);
        console.log(detects)
        if (+detects?._label && Number.isInteger(+detects?._label) && detects?._distance < 0.45) {
            let res = await this.authService.checkAuthById(+detects._label);
            return {
                ...detects,
                ...res
            }
        } else {
            return detects;
        }
    }

    @UseGuards(AccessTokenGuard)
    @Post("/samples/:id")
    @UseInterceptors(FilesInterceptor('file[]', 5))
    async uploadSample(@Param('id') user: string, @UploadedFiles(new ParseFilePipe()) files: Array<Express.Multer.File>) {
        return this.faceService.uploadLabeledImages(files?.map(f => f.buffer), user);
    }

    @Get('models/:name')
    @Header('Cache-Control', 'max-age=36000')
    getModels(@Param('name') name: string, @Res() res: Response) {
        if (name === 'faces.json') {
            res.send(this.faceService.faceMatcher?.toJSON());
            return;
        }
        const file = createReadStream(join(__dirname, "../models", name));
        file.pipe(res);
    }
}