import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { UserRepository } from "../../domain/repositories/user.repository";
import { PasswordHasher } from "../ports/password-hasher";
import { User } from "../../domain/entities/user.entity";
import { Logger } from "nestjs-pino";

export interface Input {
    email: string;
    password: string;
}

export interface Output extends Omit<User,'password'> { }


@Injectable()
export class RegisterUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher
    ) { }

    async execute(input: Input): Promise<Output> {
        const user = await this.userRepository.findByEmail(input.email);
        if (user) {
            throw new UnprocessableEntityException({message:"Email đã được sử dụng",data:[{
                field:"body.email",
                message:"Email đã được sử dụng"
            }]});
        }
        const hashedPassword = await this.passwordHasher.hash(input.password);
        const newUser = await this.userRepository.create({
            email: input.email,
            password: hashedPassword,
        });
        return newUser;
    }
}