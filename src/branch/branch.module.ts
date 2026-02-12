import { Module } from "@nestjs/common";
import { BranchController } from "./branch.controller";
import { BranchService } from "./branch.service";
import { AuthGrpcClientModule } from "src/common/auth";

@Module({
    imports: [AuthGrpcClientModule],
    controllers: [BranchController],
    providers: [BranchService]
})
export class BranchModule {}
