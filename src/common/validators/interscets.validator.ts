import {Injectable} from '@nestjs/common';
import {Between, Equal, Not} from 'typeorm';
import {CoreEntity} from '../../base/entities/CoreEntity';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from '@nestjs/class-validator';

@ValidatorConstraint({name: 'IntersectValidator', async: true})
@Injectable()
export class IntersectValidator implements ValidatorConstraintInterface {
  async validate(value?: any, args?: ValidationArguments) {
    let object = args.object as CoreEntity;
    let query = args.constraints[0].createQueryBuilder('q').andWhere([
      {
        [args.constraints[1]]: Between(
          object[args.constraints[1]],
          object[args.constraints[2]],
        ),
      },
      {
        [args.constraints[2]]: Between(
          object[args.constraints[1]],
          object[args.constraints[2]],
        ),
      },
    ]);
    if (object.hasId()) {
      query.andWhere({ id: Not(Equal(object.id)) });
    }
    let count = await query.getCount();
    return count == 0;
  }

  defaultMessage(args: ValidationArguments) {
    return `Intersect by another wallet gift`;
  }
}

export function IntersectValidate(
  entity: (new () => CoreEntity) & typeof CoreEntity,
  from: string,
  to: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'IntersectValidat',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entity, from, to],
      validator: IntersectValidator,
    });
  };
}
