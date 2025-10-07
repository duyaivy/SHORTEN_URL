import type { CompleteMultipartUploadCommandOutput } from "@aws-sdk/client-s3";
import { StatusCodes } from "http-status-codes";
import { omit } from "lodash";
import { ObjectId } from "mongodb";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "@/common/constant/common.const";
import { URL_MESSAGES } from "@/common/constant/message.const";
import type { PaginationRequest } from "@/common/models/common.model";
import { ServiceResponse } from "@/common/models/serviceResponse";
import databaseService from "@/common/services/database.service";
import { env } from "@/common/utils/envConfig";
import { hashPassword } from "@/common/utils/hashPassword";
import { generateAndUploadQrCodeToS3 } from "@/common/utils/qrCode";
import { deleteFileS3 } from "@/common/utils/s3";
import { getUrlFromAlias } from "@/common/utils/url";
import {
  type CreateShortUrlRequest,
  type UpdateUrlRequest,
  URL,
  type URLMini,
} from "./url.model";
import { addDays } from "date-fns";

class UrlService {
  async createShortUrl(
    { alias, url, password }: CreateShortUrlRequest,
    userId?: string
  ) {
    const aliasText = encodeURIComponent(alias);
    const isExist = await databaseService.urls.findOne({
      alias: aliasText,
    });
    if (isExist) {
      throw ServiceResponse.failure(
        URL_MESSAGES.ALIAS_ALREADY_EXISTS,
        null,
        StatusCodes.BAD_REQUEST
      );
    }
    // create url -> generate qr code -> upload code to bucket -> save new url with qr code link -> return qr code link + url
    const link = getUrlFromAlias(aliasText);
    const qr_code = (await generateAndUploadQrCodeToS3(
      link,
      aliasText
    )) as CompleteMultipartUploadCommandOutput;
    const newUrl = new URL({
      alias: aliasText,
      url,
      password: password ? hashPassword(password) : null,
      owner_id: userId ? new ObjectId(userId) : null,
      is_active: true,
      qr_code: qr_code.Location as string,
      views: 0,
      exp: userId ? null : addDays(new Date(), 14), // neu da dang nhap thi khong gioi han, neu chua dang nhap thi gioi han thoi gian
    });
    await databaseService.urls.insertOne(newUrl);
    return {
      ...newUrl,
      short_url: link,
    };
  }
  async getShortUrl(alias: string) {
    const aliasText = encodeURIComponent(alias);
    const url = await databaseService.urls.findOneAndUpdate(
      { alias: aliasText, is_active: true },
      { $inc: { views: 1 } },
      { returnDocument: "after" }
    );
    if (!url) {
      throw ServiceResponse.failure(
        URL_MESSAGES.URL_NOT_FOUND,
        null,
        StatusCodes.NOT_FOUND
      );
    }
    if (url.password) {
      const newUrl = `${env.CLIENT_SHORT_LINK}/password/${aliasText}`;
      return omit({ ...url, url: newUrl }, "password");
    }
    return omit(url, "password");
  }
  async getShortUrlWithPassword(alias: string, password: string) {
    const aliasText = encodeURIComponent(alias);
    const url = await databaseService.urls.findOneAndUpdate(
      { alias: aliasText, is_active: true, password: hashPassword(password) },
      { $inc: { views: 1 } },
      { returnDocument: "after" }
    );
    if (!url) {
      throw ServiceResponse.failure(
        URL_MESSAGES.URL_NOT_FOUND_OR_INCORRECT_PASSWORD,
        null,
        StatusCodes.BAD_REQUEST
      );
    }
    return omit(url, "password");
  }
  async deleteURLsAgenda(ids: string[]) {
    await databaseService.urls.deleteMany({
      _id: { $in: ids.map((id) => new ObjectId(id)) },
    });
    return true;
  }
  async deleteURLs({ ids, userId }: { ids: string[]; userId: string }) {
    const ObjectUserId = new ObjectId(userId);
    await databaseService.urls.deleteMany({
      _id: { $in: ids.map((id) => new ObjectId(id)) },
      owner_id: ObjectUserId,
    });
    return;
  }
  async updateUrl(
    alias: string,
    { alias: aliasText, is_active, password, url }: UpdateUrlRequest,
    userId: string
  ) {
    const existURL = await databaseService.urls.findOne({
      alias: encodeURIComponent(alias),
      owner_id: new ObjectId(userId),
    });
    if (!existURL) {
      throw ServiceResponse.failure(
        URL_MESSAGES.URL_NOT_FOUND,
        null,
        StatusCodes.NOT_FOUND
      );
    }
    if (aliasText) {
      const newAlias = encodeURIComponent(aliasText);
      const [newQrCode] = await Promise.all([
        generateAndUploadQrCodeToS3(getUrlFromAlias(newAlias), newAlias),
        deleteFileS3(`${alias}.png`).catch((err) =>
          ServiceResponse.failure(
            err.message,
            null,
            StatusCodes.INTERNAL_SERVER_ERROR
          )
        ),
      ]);
      const data = await databaseService.urls.findOneAndUpdate(
        {
          _id: existURL._id,
        },
        {
          $set: {
            alias: newAlias,
            qr_code: (newQrCode as CompleteMultipartUploadCommandOutput)
              .Location as string,
            is_active: is_active ?? existURL.is_active,
            password: password ? hashPassword(password) : null,
            url: url ?? existURL.url,
          },
          $currentDate: { updated_at: true },
        },
        { returnDocument: "after" }
      );
      return omit(data, "password");
    }
    const data = await databaseService.urls.findOneAndUpdate(
      {
        _id: existURL._id,
      },
      {
        $set: {
          is_active: is_active ?? existURL.is_active,
          password: password ? hashPassword(password) : existURL.password,
          url: url ?? existURL.url,
        },
        $currentDate: { updated_at: true },
      },
      { returnDocument: "after" }
    );
    return omit(data, "password");
  }
  async updateUrlActive(urls: URLMini[], userId: string) {
    const ObjectUserId = new ObjectId(userId);
    await Promise.all(
      urls.map((url) => {
        return databaseService.urls.findOneAndUpdate(
          {
            _id: new ObjectId(url?._id),
            owner_id: ObjectUserId,
          },
          {
            $set: {
              is_active: url.is_active,
            },
            $currentDate: { updated_at: true },
          }
        );
      })
    );
    return;
  }
  async getMyURLs({ limit, page }: PaginationRequest, user_id: string) {
    const limitNumber = Number(limit) || DEFAULT_LIMIT;
    const pageNumber = Number(page) || DEFAULT_PAGE;
    const skip = (pageNumber - 1) * limitNumber;
    const [data, totalDocument] = await Promise.all([
      databaseService.urls
        .find({
          owner_id: new ObjectId(user_id),
        })
        .skip(skip)
        .limit(limitNumber)
        .toArray(),
      databaseService.urls.countDocuments({ owner_id: new ObjectId(user_id) }),
    ]);
    return {
      control: {
        total: Math.ceil(totalDocument / limitNumber),
        page: pageNumber,
        limit: limitNumber,
      },
      data: data.map((item) => {
        return {
          ...item,
          password: undefined,
          short_url: getUrlFromAlias(item.alias),
        };
      }),
    };
  }
  async createQrHistory({
    owner_id,
    decoded,
  }: {
    owner_id: string;
    decoded: string;
  }) {
    const qrHistory = await databaseService.qrHistories.findOneAndReplace(
      {
        owner_id: new ObjectId(owner_id),
        decoded,
      },
      {
        created_at: new Date(),
        owner_id: new ObjectId(owner_id),
        decoded,
      },
      { upsert: true, returnDocument: "after" }
    );
    return qrHistory;
  }
  async getMyQrHistories({ limit, page }: PaginationRequest, user_id: string) {
    const limitNumber = Number(limit) || DEFAULT_LIMIT;
    const pageNumber = Number(page) || DEFAULT_PAGE;
    const skip = (pageNumber - 1) * limitNumber;
    const [data, totalDocument] = await Promise.all([
      databaseService.qrHistories
        .find({
          owner_id: new ObjectId(user_id),
        })
        .skip(skip)
        .limit(limitNumber)
        .toArray(),
      databaseService.qrHistories.countDocuments({
        owner_id: new ObjectId(user_id),
      }),
    ]);
    return {
      control: {
        total: Math.ceil(totalDocument / limitNumber),
        page: pageNumber,
        limit: limitNumber,
      },
      data,
    };
  }
  async deleteQrHistories({ ids, userId }: { ids: string[]; userId: string }) {
    const ObjectUserId = new ObjectId(userId);
    await databaseService.qrHistories.deleteMany({
      _id: { $in: ids.map((id) => new ObjectId(id)) },
      owner_id: ObjectUserId,
    });
    return;
  }
  async reCaptcha(token: string) {
    try {
      const response = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${env.SECRECT_KEY_RECAPCHA}&response=${token}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      throw ServiceResponse.failure(
        URL_MESSAGES.RECAPTCHA_FAILED,
        false,
        StatusCodes.BAD_REQUEST
      );
    }
  }
}
export const urlService = new UrlService();
