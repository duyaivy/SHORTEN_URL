import { User } from "../entities/user.entity";

export abstract class UserRepository {
    abstract create(data: { email: string, password: string}): Promise<Omit<User, 'password'>>;
    abstract findByEmail(email: string): Promise<User | null>;
    abstract findById(id: string): Promise<User | null>;
}