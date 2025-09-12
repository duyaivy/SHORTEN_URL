import type { CompleteMultipartUploadCommandOutput } from "@aws-sdk/client-s3";
import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import { URL_MESSAGES } from "@/common/constant/message.const";
import { ServiceResponse } from "@/common/models/serviceResponse";
import databaseService from "@/common/services/database.service";
import { env } from "@/common/utils/envConfig";
import { hashPassword } from "@/common/utils/hashPassword";
import { generateAndUploadQrCodeToS3 } from "@/common/utils/qrCode";
import { type CreateShortUrlRequest, URL } from "./url.model";

class UrlService {
	async createShortUrl({ alias, url, password }: CreateShortUrlRequest, userId?: string) {
		const aliasText = encodeURIComponent(alias);
		const isExist = await databaseService.urls.findOne({
			alias: aliasText,
		});
		if (isExist) {
			throw ServiceResponse.failure("Alias đã tồn tại", null, StatusCodes.BAD_REQUEST);
		}
		// create url -> generate qr code -> upload code to bucket -> save new url with qr code link -> return qr code link + url
		const link = `http://${env.HOST}:${env.PORT}/${aliasText}`;
		const qr_code = (await generateAndUploadQrCodeToS3(link, aliasText)) as CompleteMultipartUploadCommandOutput;
		const newUrl = new URL({
			alias: aliasText,
			url,
			password: password ? hashPassword(password) : null,
			owner_id: userId ? new ObjectId(userId) : null,
			is_active: true,
			qr_code: qr_code.Location as string,
			views: 0,
		});
		await databaseService.urls.insertOne(newUrl);
		return {
			short_url: link,
			qr_code: qr_code.Location as string,
		};
	}
	async getShortUrl(alias: string) {
		const aliasText = encodeURIComponent(alias);
		const url = await databaseService.urls.findOneAndUpdate(
			{ alias: aliasText, is_active: true },
			{ $inc: { views: 1 } },
			{ returnDocument: "after" },
		);
		if (!url) {
			throw ServiceResponse.failure(URL_MESSAGES.URL_NOT_FOUND, null, StatusCodes.NOT_FOUND);
		}
		if (url.password) {
			return `${env.CLIENT_SHORT_LINK}/password?alias=${aliasText}`;
		}
		return url.url;
	}
	async getShortUrlWithPassword(alias: string, password: string) {
		const aliasText = encodeURIComponent(alias);
		const url = await databaseService.urls.findOneAndUpdate(
			{ alias: aliasText, is_active: true, password: hashPassword(password) },
			{ $inc: { views: 1 } },
			{ returnDocument: "after" },
		);
		if (!url) {
			throw ServiceResponse.failure(URL_MESSAGES.URL_NOT_FOUND_OR_INCORRECT_PASSWORD, null, StatusCodes.BAD_REQUEST);
		}
		return url.url;
	}
}
export const urlService = new UrlService();
