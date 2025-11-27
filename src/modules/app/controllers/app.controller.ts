import { Controller, Get, Post, Body } from "@nestjs/common";
import { AppService } from "../services/app.services";


export class CreateAppClassDto {
    id: string;
    redirect_uri: string;
}

export class UpdateAppClassDto {
    id: string;
    new_redirect_uri: string;
}

@Controller("/")
export class AppController {
    constructor(private appService: AppService) {
    }

    @Get('health')
    getHealth() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }

    @Post('create')
    createAppClass(@Body() createAppClassDto: CreateAppClassDto) {
        return this.appService.createAppClass(createAppClassDto);
    }

    @Post('updateUri')
    updateAppClass(@Body() updateAppClassDto: UpdateAppClassDto) {
        return this.appService.updateAppClass(updateAppClassDto);
    }

    @Get('getUri')
    getAppClassUri(@Body() idDto: { id: string }) {
        return this.appService.getAppClassUri(idDto.id);
    }
}