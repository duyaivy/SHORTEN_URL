import { IsEmail, IsString, Matches, MinLength } from "class-validator";

export class RegisterDTO {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
    @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Mật khẩu phải có ít nhất 1 chữ thường và 1 số' })    
    password: string;
}