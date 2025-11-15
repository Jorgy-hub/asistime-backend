import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UserController } from "./controllers/user.controller";
import { UserService } from "./services/user.service";
import { User, UserSchema } from "./schemas/user.schema";
import { AuthModule } from "../auth";

@Module({
    imports: [
        MongooseModule.forFeature([{name: User.name, schema: UserSchema}]), 
        forwardRef(() => AuthModule),
    ],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService]
})
export class UserModule {}