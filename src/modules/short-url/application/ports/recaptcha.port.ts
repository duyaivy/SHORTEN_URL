export abstract class RecaptchaPort {
  abstract verify(token: string): Promise<{ success: boolean; [key: string]: unknown }>;
}
