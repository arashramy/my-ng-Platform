import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';
import { CoreEntity } from './CoreEntity';
import { jsonTransformer } from '../../common/typeorm/converter/json-transformer';
import { OrganizationUnit } from './OrganizationUnit';
import { Audit } from '../../common/decorators/audit.decorator';

@Audit()
@Entity({ name: '_survey_questions' })
export class SurveyQuestions extends CoreEntity {
  @Column('text', { name: 'title', nullable: false })
  title: string;

  @Column('text', { name: 'sub_title', nullable: true })
  subTitle: string;

  @Column('text', {
    name: 'questions',
    nullable: false,
    transformer: jsonTransformer,
  })
  questions: { question: string; answerType: string }[];

  @ManyToMany(() => OrganizationUnit, (orgUnit) => orgUnit.questions, {
    nullable: true,
  })
  @JoinTable()
  orgUnits: OrganizationUnit[];
}
