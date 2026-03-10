import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'atLeastOne', async: false })
class AtLeastOne implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const object = args.object as Record<string, any>;
    const properties: string[] = args.constraints[0];
    return properties.some(
      (prop) => object[prop] !== undefined && object[prop] !== null,
    );
  }

  defaultMessage(args: ValidationArguments) {
    return `At least one parameter is required: ${args.constraints[0].join(', ')}`;
  }
}

@ValidatorConstraint({ name: 'slugRequiresBranch', async: false })
class SlugRequiresBranch implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as GetBranchProductDto;
    if (obj.slug && !obj.branchId) {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return `If slug is provided, branchId is required`;
  }
}

export class GetBranchProductDto {
  @ApiPropertyOptional({ description: 'Branch product id', example: 7001 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchProductid?: number;

  @ApiPropertyOptional({
    description: 'Product slug',
    example: 'oak-dining-table-120',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'Branch id for slug lookup', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number;

  @Validate(AtLeastOne, [['branchProductid', 'slug']], {
    message: 'At least one parameter is required: branchProductid or slug',
  })
  _dummy?: any;

  @Validate(SlugRequiresBranch)
  _slugBranchCheck?: any;
}
