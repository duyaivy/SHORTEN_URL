import { Injectable, BadRequestException } from '@nestjs/common';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';
import { PasswordHasher } from '../../../auth/application/ports/password-hasher';

@Injectable()
export class GetShortUrlWithPasswordUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(alias: string, password: string) {
    const aliasText = encodeURIComponent(alias);

    const url =
      await this.shortUrlRepository.findByAliasAndIncrementViews(aliasText);
    if (!url || !url.password) {
      throw new BadRequestException({
        message: 'URL không tồn tại hoặc mật khẩu không đúng',
        data: [{ field: 'body.password', message: 'URL không tồn tại hoặc mật khẩu không đúng' }],
      });
    }

    const isPasswordValid = await this.passwordHasher.compare(
      password,
      url.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException({
        message: 'Mật khẩu không chính xác',
        data: [{ field: 'body.password', message: 'Mật khẩu không chính xác' }],
      });
    }

    const { password: _, ...rest } = url;
    return rest;
  }
}
