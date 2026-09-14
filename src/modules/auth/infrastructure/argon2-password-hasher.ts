import { Injectable } from "@nestjs/common";
import { PasswordHasher } from "../application/ports/password-hasher";
import * as argon2 from 'argon2';

@Injectable()
export class ArgonPasswordHasher implements PasswordHasher{
     constructor(
    
  ) {}
    async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return argon2.verify(hashedPassword, plainPassword);
    }
    async hash(password: string): Promise<string> {
       return argon2.hash(password);
    }
}   