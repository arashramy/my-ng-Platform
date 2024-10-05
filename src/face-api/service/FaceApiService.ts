// import '@tensorflow/tfjs-node';

import * as faceapi from '@vladmandic/face-api';
import {FaceMatcher, LabeledFaceDescriptors} from '@vladmandic/face-api';
import * as fs from 'fs';
import * as path from 'path';
import {BadRequestException, Injectable} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import * as canvas from 'canvas';
import {EventEmitter2} from "@nestjs/event-emitter";
import {EventsConstant} from "../../common/constant/events.constant";
import {UsersService} from "../../auth/service/users.service";

const {Canvas, Image, ImageData} = require('canvas')
faceapi.env.monkeyPatch({Canvas, Image, ImageData})

@Injectable()
export class FaceApiService {
    distance: 0.5;
    models: LabeledFaceDescriptors[];
    faceMatcher?: FaceMatcher;

    constructor(private configService: ConfigService,
                private userService: UsersService,
                private eventEmitter: EventEmitter2) {
        this.init();
    }

    async init() {
        await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/../models");
        await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/../models");
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/../models");
        await faceapi.nets.faceExpressionNet.loadFromDisk(__dirname + "/../models");
        await faceapi.nets.ageGenderNet.loadFromDisk(__dirname + "/../models");
        this.loadFacesModels();
        this.initFaceDetector();
    }

    async getDescriptors(image: Buffer) {
        // Read the image using canvas or other method
        const img: any = await canvas.loadImage(image);
        let temp = faceapi.createCanvasFromMedia(img);
        // Process the image for the model
        const displaySize = {width: img.width, height: img.height};
        faceapi.matchDimensions(temp, displaySize);

        // Find matching faces
        const detections = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor()
            .withFaceExpressions()
            .withAgeAndGender();
        if (detections)
            return {
                ...this.faceMatcher.findBestMatch(detections?.descriptor),
                age:detections.age,
                gender: detections.gender,
                state: detections.expressions.asSortedArray()
            };
        throw new BadRequestException('Fec not detect')
    }

    async uploadLabeledImages(images: Buffer[], label: string) {
        try {
            let counter = 0;
            const descriptions = [];
            // Loop through the images
            for (let i = 0; i < images.length; i++) {
                const img: any = await canvas.loadImage(images[i]);
                counter = (i / images.length) * 100;
                console.log(`Progress = ${counter}%`);
                // Read each face and save the face descriptions in the descriptions array
                const detections = await faceapi.detectSingleFace(img)
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                descriptions.push(detections.descriptor);
            }

            let model = new faceapi.LabeledFaceDescriptors(label, descriptions);
            let index = this.models.findIndex(m => m.label === label);
            if (index >= 0) {
                this.models[index] = model;
            } else {
                this.models.push(model)
            }
            this.initFaceDetector();
            this.updateFacesModelsFiles();
            this.eventEmitter.emit(EventsConstant.FACE_GET_SAMPLE, model.toJSON());
            await this.userService.update(+label, {
                faceSample: true
            })
            return true;
        } catch (error) {
            console.log(error);
            return (error);
        }
    }

    initFaceDetector() {
        if (this.models.length)
            this.faceMatcher = new FaceMatcher(this.models, this.distance);
    }

    loadFacesModels() {
        try {
            let dir = this.configService.get('FACES_MODEL_PATH', '../opt/models');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            let file = fs.readFileSync(path.join(dir, 'faces.json'), 'utf8');
            if (file) {
                this.faceMatcher = FaceMatcher.fromJSON(JSON.parse(file));
                this.models = this.faceMatcher.labeledDescriptors;
            }

        } catch (e) {
            console.log(e)
            this.models = [];
        }
    }


    updateFacesModelsFiles() {
        try {
            let dir = this.configService.get('FACES_MODEL_PATH', '/opt/models');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            fs.writeFileSync(path.join(dir, 'faces.json'), JSON.stringify(this.faceMatcher.toJSON()), {encoding: 'utf-8'});
        } catch (e) {
            console.error('unable write models', e)
        }
    }
}


//sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev