import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class HealthDto {
  @ApiProperty({ description: 'Health marker', example: 'ok' })
  @IsString()
  test: string;
}
