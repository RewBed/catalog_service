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

export class GetCategoryDto {
    @ApiProperty({ description: "ID категории" })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id?: number

    @ApiProperty({ description: "slug категории" })
    @IsOptional()
    @IsString()
    slug?: string

    @Validate(AtLeastOne, [['id', 'slug']], {
        message: 'Должен быть указан хотя бы один параметр: id или slug',
    })
    _dummy?: any; // Для запуска валидатора на уровне класса
}
