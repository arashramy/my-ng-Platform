import {
  Column,
  Entity,
  JoinColumn,
  Like,
  ManyToMany,
  ManyToOne,
  RelationId,
} from 'typeorm';
import { CoreEntity } from './CoreEntity';
import { UniqueValidate } from '../../common/validators/unique.validator';
import { GlobalFilter } from '../../common/decorators/mvc.decorator';
import { Export } from '../../common/decorators/export.decorator';
import { PermissionKey } from '../../common/constant/auth.constant';
import { Location } from './Location';
import { SurveyQuestions } from './SurvayQuestion';
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Entity({ name: '_organization_unit' })
@Export<OrganizationUnit>({
  name: 'OrganizationUnit',
  translateKey: PermissionKey.BASE_ORGANIZATION_UNIT,
})
export class OrganizationUnit extends CoreEntity {
  @UniqueValidate(OrganizationUnit)
  @GlobalFilter({ where: (param: string) => Like(`%${param}%`) })
  @Column({ name: 'title' })
  title?: string;

  @Column({ name: 'description', nullable: true, default: null })
  description?: string;

  @JoinColumn({ name: 'location' })
  @ManyToOne(() => Location)
  location?: Location;
  @RelationId((ou: OrganizationUnit) => ou.location)
  locationId?: number;

  @ManyToMany(
    () => SurveyQuestions,
    (surveyQuestion) => surveyQuestion.orgUnits,
    {
      nullable: true,
    },
  )
  questions: SurveyQuestions;
}
