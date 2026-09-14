import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { UserRepository } from "../../domain/repositories/user.repository";

@Injectable()
export class GetMeUseCase {
    constructor(
        private readonly userRepository: UserRepository,
    ) { }
    async execute(userId: string): Promise<any> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new UnprocessableEntityException('User not found');
        }
        return { ...user, password: undefined };
    }
}