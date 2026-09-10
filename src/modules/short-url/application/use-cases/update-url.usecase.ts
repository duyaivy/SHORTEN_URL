import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';
import { PasswordHasher } from '../../../auth/application/ports/password-hasher';

export interface UpdateUrlInput {
  alias?: string;
  url?: string;
  password?: string;
  is_active?: boolean;
}

@Injectable()
export class UpdateUrlUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(alias: string, input: UpdateUrlInput, userId: string) {
    const encodedAlias = encodeURIComponent(alias);

    const existing =
      await this.shortUrlRepository.findByAlias(encodedAlias);
    if (!existing || existing.owner_id !== userId) {
      throw new NotFoundException({
        message: 'Không tìm thấy URL',
        data: [{ field: 'params.alias', message: 'URL không tồn tại' }],
      });
    }

    const updateData: {
      alias?: string;
      url?: string;
      password?: string | null;
      is_active?: boolean;
    } = {};

    if (input.alias !== undefined) {
      updateData.alias = encodeURIComponent(input.alias);
    }
    if (input.url !== undefined) {
      updateData.url = input.url;
    }
    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }
    if (input.password !== undefined) {
      updateData.password = input.password
        ? await this.passwordHasher.hash(input.password)
        : null;
    }

    const updated = await this.shortUrlRepository.update(
      existing.id,
      updateData,
    );

    if (!updated) {
      throw new NotFoundException({
        message: 'Không tìm thấy URL',
        data: [{ field: 'params.alias', message: 'URL không tồn tại' }],
      });
    }

    const { password, ...rest } = updated;
    return rest;
  }
}
