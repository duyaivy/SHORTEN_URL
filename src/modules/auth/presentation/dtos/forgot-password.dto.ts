import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";
import { RegisterDTO } from "./register.dto";

export class ForgotPasswordDTO {
    @ApiProperty({
        description: 'Email address to receive the password reset link',
        example: 'user@example.com',
    })
    @IsEmail()
    email: string;
}
