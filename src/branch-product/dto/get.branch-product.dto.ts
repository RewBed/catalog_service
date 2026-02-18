import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min, Validate } from "class-validator";
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';


@ValidatorConstraint({ name: 'atLeastOne', async: false })
class AtLeastOne implements ValidatorConstraintInterface {
    validate(_: any, args: ValidationArguments) {
        const object = args.object as Record<string, any>;
        const properties: string[] = args.constraints[0]; // теперь точно массив
        return properties.some(prop => object[prop] !== undefined && object[prop] !== null);
    }

    defaultMessage(args: ValidationArguments) {
        return `Должен быть указан хотя бы один параметр: ${args.constraints[0].join(', ')}`;
    }
}

// Новый валидатор для зависимости slug → branchId
@ValidatorConstraint({ name: 'slugRequiresBranch', async: false })
class SlugRequiresBranch implements ValidatorConstraintInterface {
    validate(_: any, args: ValidationArguments) {
        const obj = args.object as GetBranchProductDto;
        // Если slug указан, branchId обязателен
        if (obj.slug && !obj.branchId) {
            return false;
        }
        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return `Если указан slug, то branchId обязателен`;
    }
}

export class GetBranchProductDto {
    @ApiProperty({ description: "ID товара" })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    branchProductid?: number

    @ApiProperty({ description: "slug товара" })
    @IsOptional()
    @IsString()
    slug?: string

    @ApiProperty({ description: "филиал товара" })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    branchId?: number

    @Validate(AtLeastOne, [['branchProductid', 'slug']], {
        message: 'Должен быть указан хотя бы один параметр: branchProductid или slug',
    })
    _dummy?: any;

    // Валидатор: если slug указан, branchId обязателен
    @Validate(SlugRequiresBranch)
    _slugBranchCheck?: any;
}