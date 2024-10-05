import { Body, Controller, Get, Header, Param, ParseIntPipe, Post, Res, StreamableFile } from "@nestjs/common";
import { Response } from "express";
import { createReadStream, createWriteStream, readFileSync } from "fs";
import { Stream } from "stream";
import { PermissionKey } from "../common/constant/auth.constant";
import { ReadController } from "../common/controller/base.controller";
import { Backup } from "./backup.entity";

@Controller('/api/backup')
export class BackupController extends ReadController<Backup> {
    constructor() {
        super(Backup, PermissionKey.BASE_BACKUP);
    }

    @Get('/download/:id')
    async downloadBackupFile(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const backup = await Backup.findOne({ where: { id } });
        if (!backup) return;
        const readStream = createReadStream(backup.filename);
        readStream.pipe(res);
        return;
    }

    additionalPermissions(): string[] {
        return []
    }
}