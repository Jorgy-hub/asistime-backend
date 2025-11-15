import { Resolver, Query, Args } from '@nestjs/graphql';
import { Student } from '../schemas/student.schema';
import { StudentsService } from '../services/students.service';


@Resolver((of) => Student)
export class StudentResolver {
  constructor(private readonly studentService: StudentsService) { }

  @Query(() => [Student])
  async students(): Promise<Student[]> {
    return this.studentService.getAllStudents();
  }

  @Query(() => [Student])
  async studentsFilter(
    @Args('name', { nullable: true }) name?: string,
    @Args('id', { nullable: true }) id?: string,
    @Args('group', { nullable: true }) group?: string,
    @Args('semester', { nullable: true }) semester?: string,
    @Args('career', { nullable: true }) career?: string,
    @Args('shift', { nullable: true }) shift?: string,
  ): Promise<Student[]> {
    return this.studentService.filterStudents({ name, id, group, semester, career, shift });
  }


  @Query(() => Student)
  async student(@Args('id') id: string): Promise<Student> {
    return this.studentService.getStudentById(id);
  }
}
