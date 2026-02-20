import { Module } from "@nestjs/common";
import { BranchService } from "./branch.service";
import { AuthGrpcClientModule } from "src/common/auth";
import { PublicBranchController } from "./controllers/public-branch.controller";
import { AdminBranchController } from "./controllers/admin-branch.controller";

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [PublicBranchController, AdminBranchController],
    providers: [BranchService]
})
export class BranchModule {}
