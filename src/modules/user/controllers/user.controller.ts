import { Controller, Redirect, Get, Param, Post, Body, Logger } from "@nestjs/common";
import { User } from "../schemas/user.schema";
import { ApiBody } from "@nestjs/swagger";
import { UserService } from "../services/user.service";
import { UserAuthDto } from "../dtos/user.dto";

@Controller("user")
export class UserController {
    private readonly logger = new Logger(UserController.name);

    constructor(private userService: UserService) {
        this.logger.log('Admin Controller initialized');
    }

    @Get("/all")
    async findAll(): Promise<User[]> {
        this.logger.log('Fetching all users');
        return this.userService.findAll();
    }
}