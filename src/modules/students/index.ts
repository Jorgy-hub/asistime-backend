import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Student, StudentSchema } from "./schemas/student.schema";
import { StudentsController } from "./controllers/students.controller";
import { StudentsService } from "./services/students.service";
import { StudentResolver } from "./resolvers/students.resolver";
import { EventsModule } from "../../events/events.module";

@Module({
    imports: [
        MongooseModule.forFeature([{name: Student.name, schema: StudentSchema}]),
        EventsModule
    ],
    controllers: [StudentsController],
    providers: [StudentsService, StudentResolver]
})
export class StudentsModule {}