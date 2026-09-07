export abstract class PasswordHasher {
  abstract compare(plainPassword: string, hashedPassword: string): Promise<boolean>;
  abstract hash(password: string): Promise<string>;
}