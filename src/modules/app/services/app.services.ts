import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AppClass } from "../schemas/app.schema";
import { CreateAppClassDto, UpdateAppClassDto } from "../controllers/app.controller";

@Injectable()
export class AppService {
    constructor(
        @InjectModel(AppClass.name) private appClassModel: Model<AppClass>,
    ) { }

    async createAppClass(createAppClassDto: CreateAppClassDto): Promise<AppClass> {
        const createdAppClass = new this.appClassModel(createAppClassDto);
        return createdAppClass.save();
    }

    async updateAppClass(updateAppClassDto: UpdateAppClassDto): Promise<AppClass> {
        if (!updateAppClassDto.id || !updateAppClassDto.new_redirect_uri?.trim()) {
            throw new BadRequestException('id and new_redirect_uri required');
        }
        const updated = await this.appClassModel.findOneAndUpdate(
            { id: updateAppClassDto.id },
            { $set: { redirect_uri: updateAppClassDto.new_redirect_uri.trim() } },
            { new: true }
        ).exec();
        if (!updated) throw new NotFoundException('App class not found');
        return updated;
    }

    async getAppClassUri(id: string): Promise<string> {
        const appClass = await this.appClassModel.findOne({ id });
        return appClass ? appClass.redirect_uri : null;
    }
}