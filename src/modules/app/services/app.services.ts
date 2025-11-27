import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AppClass } from "../schemas/app.schema";
import { CreateAppClassDto } from "../controllers/app.controller";

@Injectable()
export class AppService {
    constructor(
        @InjectModel(AppClass.name) private appClassModel: Model<AppClass>,
    ) { }

    async createAppClass(createAppClassDto: CreateAppClassDto): Promise<AppClass> {
        const createdAppClass = new this.appClassModel(createAppClassDto);
        return createdAppClass.save();
    }

    async updateAppClass(updateAppClassDto: { id: string; new_redirect_uri: string }): Promise<AppClass> {
        const updatedAppClass = await this.appClassModel.findOneAndUpdate(
            { id: updateAppClassDto.id },
            { redirect_uri: updateAppClassDto.new_redirect_uri },
            { new: true },
        );
        return updatedAppClass;
    }

    async getAppClassUri(id: string): Promise<string> {
        const appClass = await this.appClassModel.findOne({ id });
        return appClass ? appClass.redirect_uri : null;
    }
}