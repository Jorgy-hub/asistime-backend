import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "../schemas/user.schema";
import { Model } from "mongoose";
import { UserAuthDto, UpdateUserDto } from "../dtos/user.dto";

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private studentModel: Model<User>) { }
    
    async findOne(username: string) {
        return this.studentModel.findOne({username});
    }

    async register(username: string, hashedPassword: string, admin = false, permissions?: string[]): Promise<User> {
        return this.studentModel.create({username, password: hashedPassword, admin, permissions});
    }

    async delete(username: string): Promise<any> {
        return this.studentModel.deleteOne({username});
    }

    async findAll(): Promise<User[]> {
        return this.studentModel.find().exec();
    }
}