import { Controller, Get, Post, Body, Query, NotFoundException } from "@nestjs/common";
import { AppService } from "../services/app.services";
import { ApiBody } from "@nestjs/swagger";


export class CreateAppClassDto {
    id: string;
    redirect_uri: string;
}

export class UpdateAppClassDto {
    id: string;
    new_redirect_uri: string;
}

export class GetAppClassUriDto {
    id: string;
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
    @ApiBody({ type: CreateAppClassDto })
    createAppClass(@Body() createAppClassDto: CreateAppClassDto) {
        return this.appService.createAppClass(createAppClassDto);
    }

    @Post('updateUri')
    @ApiBody({ type: UpdateAppClassDto })
    updateAppClass(@Body() updateAppClassDto: UpdateAppClassDto) {
        return this.appService.updateAppClass(updateAppClassDto);
    }

    @Get('getUri')
    async getAppClassUri(@Query('id') id: string) {
        const redirect_uri = await this.appService.getAppClassUri(id);
        if (!redirect_uri) throw new NotFoundException('App class not found');
        return { redirect_uri };
    }
}