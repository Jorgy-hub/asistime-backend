import { ApiProperty } from "@nestjs/swagger";

export class StudentsDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  career: string;

  @ApiProperty()
  prev_semester: string;

  @ApiProperty()
  semester: string;

  @ApiProperty()
  gender: string;

  @ApiProperty()
  age: string;

  @ApiProperty()
  shift: string;

  @ApiProperty()
  prev_group: string;

  @ApiProperty()
  group: string;

  @ApiProperty()
  logs: number[];
};

export class LoginDto {
  @ApiProperty()
  exit: boolean;
}