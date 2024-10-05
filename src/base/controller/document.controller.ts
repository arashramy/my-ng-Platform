import {
    Controller,
    Get,
    Header,
    NotFoundException,
    Param,
    ParseFilePipe,
    Post,
    Query,
    Res,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import {FileInterceptor, FilesInterceptor} from "@nestjs/platform-express";
import {docStorage} from "../../common/multer/storage.engine";
import {Document, DocumentType} from "../entities/Document";
import {CurrentUser} from "../../auth/decorators/current-user.decorator";
import {User} from "../entities/User";
import {createQueryForEntity} from "../../common/decorators/mvc.decorator";
import {AccessTokenGuard} from "../../auth/guard/access-token.guard";

@UseGuards(AccessTokenGuard)
@Controller('/api/document')
export class DocumentController {

    @Get('/page')
    async findPage(@Query() params: any, @CurrentUser() current: User) {
        if (!params.limit) {
            params.limit = 10;
        }
        let query = createQueryForEntity(
            Document,
            params,
            'findAll',
            current,
            null,
            'offset'
        );
        let result = await query.getManyAndCount();
        return {
            total: result[1],
            content: result[0],
        };
    }

    @Post("/upload/:type")
    @UseInterceptors(FileInterceptor('file', {storage: docStorage}))
    async upload(@Param('type') type: DocumentType,
                 @UploadedFile(new ParseFilePipe()) file: Express.Multer.File, @CurrentUser() current: User) {
        let doc: Document = {
            path: file.path,
            name: file.filename,
            originalName: file.originalname,
            type: type,
            size: file.size,
            contentType: file.mimetype,
            createdBy: current
        } as Document;
        return Document.save(doc);
    }

    @Post("/uploads/:type")
    @UseInterceptors(FilesInterceptor('file[]', 10, {storage: docStorage}))
    async uploads(@Param('type') type: DocumentType,
                  @UploadedFiles(new ParseFilePipe()) files: Array<Express.Multer.File>, @CurrentUser() current: User) {
        let doc = files.map(file => ({
            path: file.path,
            name: file.filename,
            originalName: file.originalname,
            type: type,
            size: file.size,
            contentType: file.mimetype,
            createdBy: current
        }) as Document);

        return Document.save(doc);
    }

    @Get("/download/:id")
    @Header('Cache-Control', 'max-age=36000')
    async getFileById(@Param('id') id: number, @Res() res) {
        let doc = await Document.findOne({where: {id: id}});
        if (!doc) {
            throw new NotFoundException()
        }
        res.attachment(doc.originalName);
        res.contentType(doc.contentType);
        res.download(doc.path);
    }

    @Get("/download/:type/:name")
    @Header('Cache-Control', 'max-age=36000')
    async getFileByName(@Param('type') type: DocumentType, @Param('name') name: string, @Res() res) {
        let doc = await Document.findOne({where: {type: type, name: name}});
        if (!doc) {
            throw new NotFoundException()
        }
        res.attachment(doc.originalName);
        res.contentType(doc.contentType);
        res.download(doc.path);
    }
}
