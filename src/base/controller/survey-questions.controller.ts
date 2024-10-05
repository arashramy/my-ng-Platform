import { PermissionKey } from '../../common/constant/auth.constant';
import { BaseController } from '../../common/controller/base.controller';
import { SurveyQuestions } from '../entities/SurvayQuestion';
import { Controller, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guard/access-token.guard';

@Controller('/api/survey-questions')
@UseGuards(AccessTokenGuard)
export class SurveyQuestionsController extends BaseController<SurveyQuestions> {
  constructor() {
    super(SurveyQuestions, PermissionKey.BASE_SERVEY_QUESTION);
  }

  additionalPermissions(): string[] {
    return [];
  }
}
