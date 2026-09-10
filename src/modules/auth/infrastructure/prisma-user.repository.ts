import { BadRequestException, Injectable } from "@nestjs/common";
import { User as PrismaUser } from "@prisma/client";
import { PrismaService } from "../../../shared/services/prisma.service";
import { User } from "../domain/entities/user.entity";
import { UserRepository } from "../domain/repositories/user.repository";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) { }

  async create(data: { email: string; password: string, name?: string, avatar?: string }): Promise<Omit<User, 'password'>> {
    const prismaUser = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        username: data?.name || data.email,
        avatar_url: data?.avatar || undefined,
      },
    });

    const userEntity = this.mapToEntity(prismaUser);
    const { password, ...userWithoutPassword } = userEntity;
    return userWithoutPassword;
  }
  async updatePassword(id: string, password: string): Promise<boolean> {
    try {

      await this.prisma.user.update({
        where: { id },
        data: { password },
      });

    } catch (error) {
      throw new BadRequestException('Failed to update password');
    }
    return true
  }

  async findByEmail(email: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!prismaUser) {
      return null;
    }

    return this.mapToEntity(prismaUser);
  }

  async findById(id: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!prismaUser) {
      return null;
    }

    return this.mapToEntity(prismaUser);
  }

  private mapToEntity(prismaUser: PrismaUser): User {
    return new User(
      prismaUser.id,
      prismaUser.username ?? '',
      prismaUser.email,
      prismaUser.password,
      prismaUser.created_at ?? new Date(),
      prismaUser.updated_at ?? new Date(),
      prismaUser.avatar_url ?? undefined,
    );
  }
}