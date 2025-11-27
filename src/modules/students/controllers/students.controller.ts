import { Controller, Redirect, Get, Param, Post, Body, Logger, UploadedFile, UseInterceptors } from "@nestjs/common";
import { Student } from "../schemas/student.schema";
import { ApiBody } from "@nestjs/swagger";
import { StudentsService } from "../services/students.service";
import { StudentsDto, LoginDto } from "../dtos/students.dto";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("students")
export class StudentsController {
    private readonly logger = new Logger(StudentsController.name);

    constructor(private studentsService: StudentsService) {
        this.logger.log('StudentsController initialized');
    }

    @Post("create")
    @ApiBody({ type: StudentsDto })
    async register(@Body() body: StudentsDto): Promise<Student> {
        this.logger.log('Registering student:', body.id);
        return await this.studentsService.register(body);
    }

    @Post("qr/:id")
    async qr(@Param('id') id: string): Promise<Student> {
        return await this.studentsService.generateQr(id);
    }

    // New students (1st semester) — range B9:F...
    @Post("import/new")
    @UseInterceptors(FileInterceptor("file"))
    async importNew(@UploadedFile() file: Express.Multer.File) {
        return this.studentsService.importExcelToDb(0, file);
    }

    // Update existing (2nd–4th) and delete missing 4th — range A4:J...
    @Post("import/update")
    @UseInterceptors(FileInterceptor("file"))
    async importUpdate(@UploadedFile() file: Express.Multer.File) {
        return this.studentsService.importExcelToDb(1, file);
    }

    @Post("allQr")
    async allQr(): Promise<Student[]> {
        this.logger.log('Generating QR codes for all students');
        return await this.studentsService.generateDbQrs();
    }

    @Post("cleanLogs/:id")
    async cleanLogs(@Param('id') id: string): Promise<Student> {
        this.logger.log('Cleaning logs for student ID:', id);
        return await this.studentsService.cleanAllLogs(id);
    }

    @Post("cleanDbLogs")
    async cleanDbLogs(): Promise<{ cleaned: number }> {
        this.logger.log('Cleaning logs for all students in the database');
        return await this.studentsService.cleanDbLogs();
    }

    @Post("addReport")
    async addReport(@Body() body: { id: string, report: Report }): Promise<Student> {
        this.logger.log('Adding report for student ID:', body.id);
        return await this.studentsService.addReport(body.id, body.report);
    }

    @Post("deleteReport")
    async removeReport(@Body() body: { id: string, at: number }): Promise<Student> {
        this.logger.log('Removing report for student ID:', body.id);
        return await this.studentsService.removeReport(body.id, body.at);
    }

    @Post("updateReport")
    async editReport(@Body() body: { id: string, at: number, report: Partial<Report> }): Promise<Student> {
        this.logger.log('Editing report for student ID:', body.id);
        return await this.studentsService.editReport(body.id, body.at, body.report);
    }

    @Get("countCurrentlyInside")
    async countCurrentlyInside(): Promise<number> {
        return await this.studentsService.countCurrentlyInside();
    }

    @Get("countCurrentlyOutside")
    async countCurrentlyOutside(): Promise<number> {
        return await this.studentsService.countCurrentlyOutside();
    }

    @Get("countTotalStudents")
    async countTotalStudents(): Promise<number> {
        return await this.studentsService.countTotalStudents();
    }

    @Get("countNewStudents")
    async countNewStudents(): Promise<number> {
        return await this.studentsService.countNewStudents();
    }

    @Post(":id")
    @ApiBody({ type: LoginDto })
    async login(@Param('id') id: string, @Body() body: LoginDto): Promise<Student> {
        this.logger.log('Login attempt for ID:', id);
        return await this.studentsService.markAccess(id, body.exit);
    }

    @Get(':id')
    @Redirect()
    async getStudent(@Param('id') id: string) { 
        const redirectUri = await this.studentsService.getUri("prepa3") || 'https://preparatoria3.uanl.mx';
        return { url: redirectUri, statusCode: 301 };
    }
}