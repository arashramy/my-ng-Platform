import * as multer from "multer";
import * as path from 'path';
import * as fs from 'fs';
import {DocumentType} from "../../base/entities/Document";

export const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir = process.env.MEDIA_PATH || '/opt/media';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }
        cb(null, dir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E3)
        cb(null, uniqueSuffix + '' + (path.extname(file.originalname)))
    }
})


export const docStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir = req.params['type'] || DocumentType.Others;
        let filePath = path.join(process.env.DOC_PATH, dir);
        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath, {recursive: true});
        }
        cb(null, filePath)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E3)
        cb(null, uniqueSuffix + '' + (path.extname(file.originalname)))
    }
})

