import { Injectable } from '@nestjs/common';
import { RandomGenerator } from '../application/ports/random-generator';
import * as crypto from 'crypto';

@Injectable()
export class CryptoRandomGenerator implements RandomGenerator {
  generate(length: number = 10): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }
}
