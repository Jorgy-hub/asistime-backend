import { ApiProperty } from "@nestjs/swagger";

export class UserAuthDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  admin?: boolean;

  @ApiProperty()
  permissions?: string[];
};

export class UpdateUserDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  password?: string;

  @ApiProperty()
  admin?: boolean;

  @ApiProperty()
  permissions?: string[];
}