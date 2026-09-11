import { IsJWT, IsString, Matches, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ResetPasswordDTO {
    @ApiProperty({
        description: 'JWT token received from the password reset email',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    @IsJWT()
    token: string;

    @ApiProperty({
        description: 'New password (min 6 characters, must contain at least 1 letter and 1 digit)',
        example: 'newpassword123',
        minLength: 6,
    })
    @IsString()
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Mật khẩu phải có ít nhất 1 chữ thường và 1 số' })
    password: string;
}
