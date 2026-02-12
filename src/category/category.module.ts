import { Module } from "@nestjs/common";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { AuthGrpcClientModule } from "src/common/auth";

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [CategoryController],
    providers: [CategoryService]
})
export class CategoryModule {}
