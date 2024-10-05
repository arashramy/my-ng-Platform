import {Module} from '@nestjs/common';
import {ExcelService} from "./export/ExcelService";
import {StripRequestContextPipe} from "./pipes/strip.request.context.pipe";
import {DateConvertorPipes} from "./pipes/date-convertor.pipes";
import {SseService} from "./sse/sse.service";
import {SettingService} from "./service/setting.service";
import {ImportService} from "./import/ImportService";

@Module({
  imports: [],
  providers: [ExcelService, StripRequestContextPipe, DateConvertorPipes, SseService, SettingService, ImportService],
  exports: [ExcelService, StripRequestContextPipe, DateConvertorPipes, SseService, SettingService, ImportService]
})
export class CommonsModule {
}
