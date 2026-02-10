import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class HealthDto {
    
    @ApiProperty({ description: "test string" })
    @IsString()
    test: string;
}