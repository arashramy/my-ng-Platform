import {Module} from '@nestjs/common';
import {AuthModule} from "../auth/auth.module";
import {CommonsModule} from "../common/commons.module";
import {FaceApiService} from "./service/FaceApiService";
import {FaceApiController} from "./controller/face-api.controller";

@Module({
  controllers: [FaceApiController],
  imports: [
    AuthModule,
    CommonsModule
  ],
  providers: [FaceApiService],
  exports: []
})
export class FaceApiModule {
}
