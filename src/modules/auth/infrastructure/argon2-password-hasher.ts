import { Injectable } from "@nestjs/common";
import { PasswordHasher } from "../application/ports/password-hasher";
import * as argon2 from 'argon2';
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariables } from "../../../shared/config/env.validation";


@Injectable()
export class ArgonPasswordHasher implements PasswordHasher{
     constructor(
    // Inject ConfigService và truyền EnvironmentVariables vào kiểu dữ liệu
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}
    async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return argon2.verify(hashedPassword, plainPassword);
    }
    async hash(password: string): Promise<string> {
       return argon2.hash(password);
    }
}   