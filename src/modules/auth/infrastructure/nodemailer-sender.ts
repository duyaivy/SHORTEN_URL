import { Injectable } from "@nestjs/common";
import { EmailSender } from "../application/ports/email-sender";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariables } from "../../../shared/config/env.validation";
import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { Logger } from "nestjs-pino";
import * as fs from "fs";
import { join } from "path";

@Injectable()
export class NodeMailerSender implements EmailSender {
    private transporter: Transporter<SMTPTransport.SentMessageInfo>;
    private readonly sendTemplate = fs.readFileSync(join(__dirname, "./send-mail-template.html"), "utf8");
    constructor(
        private readonly configService: ConfigService<EnvironmentVariables, true>,
        private readonly logger: Logger,

    ) {

        this.transporter = nodemailer.createTransport({
            host: this.configService.get("EMAIL_HOST", { infer: true }) || "",
            port: Number(this.configService.get("EMAIL_PORT", { infer: true })) || 0,
            secure: false,
            auth: {
                user: this.configService.get("EMAIL_USER", { infer: true }) || "",
                pass: this.configService.get("EMAIL_PASSWORD", { infer: true }) || "",
            },
        });
    }
    async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
        const mailOptions = {
            from: this.configService.get("EMAIL_USER", { infer: true }) || "",
            to,
            subject,
            html,
        };
        try {
            const send = await this.transporter.sendMail(mailOptions);
            this.logger.log({ send }, "Email sent");
            return
        } catch (error) {
            this.logger.error({ error }, "Failed to send email");
            throw new Error((error as any).message);
        }
    }
    async sendForgotPassword(to: string, forgot_password_token: string, template: string = this.sendTemplate): Promise<void> {
        return this.sendEmail({
            to,
            subject: "Đặt lại mật khẩu cho ShortLink",
            html: template
                .replaceAll("{{title}}", "Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu.")
                .replace("{{content}}", "Nhấn vào nút bên dưới để đặt lại mật khẩu của bạn")
                .replace("{{titleLink}}", "Đặt lại mật khẩu")
                .replace("{{link}}", `${this.configService.get("CLIENT_URL", { infer: true }) || ""}/a/login?token=${forgot_password_token}`)
                .replace("{{year}}", new Date().getFullYear().toString()),
        });

    }
    async sendResetPasswordEmail(to: string, template: string = this.sendTemplate): Promise<void> {
        return this.sendEmail({
            to,
            subject: "Đã thay đổi mật khẩu cho ShortLink",
            html: template
                .replaceAll("{{title}}", "Đặt lại mật khẩu thành công")
                .replace("{{content}}", "Nhấn vào nút bên dưới truy cập vào ShortLink")
                .replace("{{titleLink}}", "Truy cập")
                .replace("{{link}}", `${this.configService.get("CLIENT_URL", { infer: true }) || ""}`)
                .replace("{{year}}", new Date().getFullYear().toString()),
        });
    }

}