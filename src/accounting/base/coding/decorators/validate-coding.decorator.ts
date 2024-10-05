import { BadRequestException } from '@nestjs/common';
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isEmpty,
  registerDecorator,
} from 'class-validator';
import { CodingType } from '../coding.entity';
import { CreateCoding } from '../dtos/create-coding.dto';

@ValidatorConstraint()
export class CreateCodingTypeValidator implements ValidatorConstraintInterface {
  validate(
    value: CodingType,
    validationArguments?: ValidationArguments,
  ): boolean | Promise<boolean> {
    const dto = validationArguments.object as CreateCoding;
    if (isEmpty(value)) {
      throw new BadRequestException('coding type should not be empty');
    }
    if (value === CodingType.Group) {
      if (!dto.codingGroupType) {
        throw new BadRequestException('coding group type must be filled ....');
      }
    } else {
      if (!dto.parentCoding) {
        throw new BadRequestException('parent coding must be filled ...');
      }
      if (dto.codingGroupType) {
        throw new BadRequestException(
          'just coding type group can include coding group type',
        );
      }
    }
    return true;
  }
}

export const ValidateCoding = () => {
  return function (target: any, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName,
      validator: CreateCodingTypeValidator,
      name: 'ValidateCoding',
    });
  };
};
