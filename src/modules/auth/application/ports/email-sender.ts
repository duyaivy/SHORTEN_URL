export abstract class EmailSender {
    abstract sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void>;
    abstract sendForgotPassword(to: string, forgot_password_token: string, template?: string): Promise<void>;
    abstract sendResetPasswordEmail(to: string, template?: string): Promise<void>;
}