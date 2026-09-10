import { IsEmail, IsJWT, IsString, Matches, MinLength } from "class-validator";

export class ForgotPasswordDTO {
    @IsEmail()
    email: string;
}