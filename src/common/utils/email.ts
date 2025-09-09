/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
import fs from "fs";
import { StatusCodes } from "http-status-codes";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import path from "path";
import { ServiceResponse } from "../models/serviceResponse";
import { env } from "./envConfig";

const verifyEmailTemplate = fs.readFileSync(path.resolve("src/common/templates/send-email.html"), "utf8");

// nodemailer
const transporter = nodemailer.createTransport({
	host: env.EMAIL_HOST,
	port: Number(env.EMAIL_PORT),
	secure: false,
	auth: {
		user: env.EMAIL_USER,
		pass: env.EMAIL_PASSWORD,
	},
} as SMTPTransport.Options);

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
	const mailOptions = {
		from: env.EMAIL_USER,
		to,
		subject,
		html,
	};
	try {
		return await transporter.sendMail(mailOptions);
	} catch (error) {
		throw ServiceResponse.failure((error as any).message, null, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};

export const sendForgotPassword = (
	to: string,
	forgot_password_token: string,
	template: string = verifyEmailTemplate,
) => {
	return sendEmail({
		to,
		subject: "Đặt lại mật khẩu cho ShortLink",
		html: template
			.replaceAll("{{title}}", "Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu.")
			.replace("{{content}}", "Nhấn vào nút bên dưới để đặt lại mật khẩu của bạn")
			.replace("{{titleLink}}", "Đặt lại mật khẩu")
			.replace("{{link}}", `${env.CLIENT_URL}/reset-password?token=${forgot_password_token}`)
			.replace("{{year}}", new Date().getFullYear().toString()),
	});
};
export const sendResetPasswordEmail = (to: string, template: string = verifyEmailTemplate) => {
	return sendEmail({
		to,
		subject: "Đã thay đổi mật khẩu cho ShortLink",
		html: template
			.replaceAll("{{title}}", "Đặt lại mật khẩu thành công")
			.replace("{{content}}", "Nhấn vào nút bên dưới truy cập vào ShortLink")
			.replace("{{titleLink}}", "Truy cập")
			.replace("{{link}}", `${env.CLIENT_URL}`)
			.replace("{{year}}", new Date().getFullYear().toString()),
	});
};
