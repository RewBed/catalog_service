import { Module } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { AuthGrpcClientModule } from "src/common/auth";
import { PublicCategoryController } from "./controllers/public-category.controller";
import { AdminCategoryController } from "./controllers/admin-category.controller";

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [PublicCategoryController, AdminCategoryController],
    providers: [CategoryService]
})
export class CategoryModule {}
