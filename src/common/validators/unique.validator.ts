import { Injectable } from '@nestjs/common';
import { Equal, Not } from 'typeorm';
import { CoreEntity } from '../../base/entities/CoreEntity';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from '@nestjs/class-validator';

@ValidatorConstraint({ name: 'UniqueValidator', async: true })
@Injectable()
export class UniqueValidator implements ValidatorConstraintInterface {
  async validate(value?: any, args?: ValidationArguments) {
    let object = args.object as CoreEntity;
    let where: any = { [args.property]: value };
    if (object.hasId()) {
      where.id = Not(Equal(object.id));
    }

    let count = await args.constraints[0].countBy(where);
    return count == 0;
  }

  defaultMessage(args: ValidationArguments) {
    return `Exist model by this ${args.property}`;
  }
}

export function UniqueValidate(
  entity: (new () => CoreEntity) & typeof CoreEntity,
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'UniqueValidate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entity],
      validator: UniqueValidator,
    });
  };
}
