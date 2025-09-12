import fs from "fs";
import { StatusCodes } from "http-status-codes";
import path from "path";
import QRCode from "qrcode";
import { PATH_IMAGES, WIDTH_QR_CODE } from "../constant/common.const";
import { ServiceResponse } from "../models/serviceResponse";
import { uploadFileS3 } from "./s3";
export const generateQRCode = async (link: string, alias: string, username?: string) => {
	try {
		const filePath = path.join(PATH_IMAGES, username ?? "", `${alias}.png`);
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		await QRCode.toFile(filePath, link, {
			color: { dark: "#000000", light: "#ffffff00" },
			width: WIDTH_QR_CODE,
		});
		return filePath;
	} catch (error) {
		return ServiceResponse.failure("Error generating QR code", error, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};
export const initialFolder = () => {
	const path = [PATH_IMAGES];
	path.forEach((path) => {
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path, { recursive: true });
		}
	});
};

export const generateAndUploadQrCodeToS3 = async (link: string, alias: string) => {
	try {
		const key = path.posix.join("", `${alias}.png`);
		const buffer = await QRCode.toBuffer(link, {
			type: "png",
			color: { dark: "#000000", light: "#ffffff00" },
			width: WIDTH_QR_CODE,
		});

		const data = await uploadFileS3({
			filename: key,
			body: buffer,
			contentType: "image/png",
		});

		return data;
	} catch (error) {
		return ServiceResponse.failure("Error generating or uploading QR code", error, StatusCodes.INTERNAL_SERVER_ERROR);
	}
};
