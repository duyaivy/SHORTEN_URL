import { StatusCodes } from "http-status-codes";
import { ObjectId } from "mongodb";
import type { StringValue } from "ms";
import {
  type RegisterRequest,
  type ResetPasswordRequest,
  User,
} from "@/api/user/user.model";
import { JWTType } from "@/common/constant/enums.const";
import { AUTH_MESSAGES } from "@/common/constant/message.const";
import { RefreshToken } from "@/common/models/refreshToken.model";
import { ServiceResponse } from "@/common/models/serviceResponse";
import databaseService from "@/common/services/database.service";
import type { TokenPayLoad } from "@/common/types/jwt.type";
import {
  sendForgotPassword,
  sendResetPasswordEmail,
} from "@/common/utils/email";
import { env } from "@/common/utils/envConfig";
import { hashPassword } from "@/common/utils/hashPassword";
import { signJWT, verifyJWT } from "@/common/utils/jwt";
import axios from "axios";
import { randomPassword } from "@/common/utils/randoms";
import { getOauthGoogleProfile, getOauthGoogleToken } from "@/common/utils/url";

class AuthService {
  async register({ email, password }: RegisterRequest) {
    const userExists = await databaseService.users.findOne({ email });
    if (userExists) {
      throw ServiceResponse.failure(
        "User already exists",
        null,
        StatusCodes.BAD_REQUEST
      );
    }
    const { insertedId } = await databaseService.users.insertOne(
      new User({ email, password: hashPassword(password) })
    );
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken({ userId: insertedId.toString() }),
      this.signRefreshToken({ userId: insertedId.toString() }),
    ]);
    return { access_token, refresh_token };
  }
  async signAccessToken({ userId }: { userId: string }) {
    const options = {
      expiresIn: env.ACCESS_TOKEN_EXPIRATION_TIME as StringValue,
    };
    const secretOrPrivateKey = env.PRIVATE_ACCESS_TOKEN_KEY;
    const payload = {
      userId,
      type: JWTType.ACCESS_TOKEN,
    };
    return await signJWT({ payload, options, secretOrPrivateKey });
  }
  async signRefreshToken({ userId, exp }: { userId: string; exp?: number }) {
    const options = exp
      ? undefined
      : {
          expiresIn: env.REFRESH_TOKEN_EXPIRATION_TIME as StringValue,
        };

    const secretOrPrivateKey = env.PRIVATE_REFRESH_TOKEN_KEY;
    const payload = exp
      ? { userId, type: JWTType.REFRESH_TOKEN, exp }
      : { userId, type: JWTType.REFRESH_TOKEN };
    const token = await signJWT({ payload, options, secretOrPrivateKey });
    // decode & save to db
    const { iat, exp: expTime } = await this.verifyRefreshToken(token);
    await databaseService.refresh_tokens.insertOne(
      new RefreshToken({
        user_id: userId.toString(),
        token,
        iat: new Date(iat * 1000),
        exp: new Date(expTime * 1000),
      })
    );
    return token;
  }
  async login({ email, password }: RegisterRequest) {
    const user = await databaseService.users.findOne({
      email,
      password: hashPassword(password),
    });
    if (!user) {
      throw ServiceResponse.failure(
        AUTH_MESSAGES.WRONG_EMAIL_OR_PASSWORD,
        null,
        StatusCodes.BAD_REQUEST
      );
    }
    const access_token = await this.signAccessToken({
      userId: user._id.toString(),
    });
    const refresh_token = await this.signRefreshToken({
      userId: user._id.toString(),
    });
    return { access_token, refresh_token };
  }
  async verifyAccessToken(token: string): Promise<TokenPayLoad> {
    const decoded = await verifyJWT({
      token,
      secretOrPublicKey: env.PRIVATE_ACCESS_TOKEN_KEY,
    });
    return decoded;
  }
  async verifyRefreshToken(token: string): Promise<TokenPayLoad> {
    const decoded = await verifyJWT({
      token,
      secretOrPublicKey: env.PRIVATE_REFRESH_TOKEN_KEY,
    });
    return decoded;
  }
  async refreshToken({
    payload,
    token,
  }: {
    payload: TokenPayLoad;
    token: string;
  }) {
    const access_token = await this.signAccessToken({ userId: payload.userId });
    const refresh_token = await this.signRefreshToken({
      userId: payload.userId,
      exp: payload.exp,
    });
    await databaseService.refresh_tokens.findOneAndDelete({ token: token });
    return { access_token, refresh_token };
  }
  async deleteRefreshTokensAgenda(ids: string[]) {
    await databaseService.refresh_tokens.deleteMany({
      _id: { $in: ids.map((id) => new ObjectId(id)) },
    });
    return true;
  }
  async forgotPassword(email: string) {
    const user = await databaseService.users.findOne({ email });
    if (!user) {
      throw ServiceResponse.failure(
        AUTH_MESSAGES.USER_NOT_FOUND,
        null,
        StatusCodes.NOT_FOUND
      );
    }
    const forgot_password_token = await this.signAccessToken({
      userId: user._id.toString(),
    });
    await sendForgotPassword(email, forgot_password_token);
    return;
  }
  async resetPassword({ password, token }: ResetPasswordRequest) {
    // get user id from token
    // update password
    // invalidate all refresh tokens
    // send email notification
    const decoded = await this.verifyAccessToken(token);
    const user = await databaseService.users.findOne({
      _id: new ObjectId(decoded.userId),
    });
    if (!user) {
      throw ServiceResponse.failure(
        AUTH_MESSAGES.USER_NOT_FOUND,
        null,
        StatusCodes.NOT_FOUND
      );
    }
    await Promise.all([
      databaseService.users.updateOne(
        { _id: user._id },
        {
          $set: { password: hashPassword(password) },
          $currentDate: { updated_at: true },
        }
      ),
      databaseService.refresh_tokens.deleteMany({
        user_id: new ObjectId(user._id),
      }),
    ]);
    sendResetPasswordEmail(user.email);
    return;
  }
  async logout({
    userId,
    refreshToken,
  }: {
    userId: string;
    refreshToken: string;
  }) {
    const data = await databaseService.refresh_tokens.findOneAndDelete({
      user_id: new ObjectId(userId),
      token: refreshToken,
    });
    if (!data) {
      throw ServiceResponse.failure(
        AUTH_MESSAGES.INVALID_REFRESH_TOKEN,
        null,
        StatusCodes.BAD_REQUEST
      );
    }
    return;
  }
  async googleOauth(code: string) {
    const { id_token, access_token } = await getOauthGoogleToken(code);
    if (!id_token || !access_token) {
      throw ServiceResponse.failure(
        AUTH_MESSAGES.FAILED_TO_FETCH_GOOGLE_TOKEN,
        null,
        StatusCodes.BAD_REQUEST
      );
    }

    const profile = await getOauthGoogleProfile(access_token, id_token);
    const userExist = await databaseService.users.findOne({
      email: profile.email,
    });
    if (userExist) {
      const [access_token, refresh_token] = await Promise.all([
        this.signAccessToken({ userId: userExist._id.toString() }),
        this.signRefreshToken({ userId: userExist._id.toString() }),
      ]);
      return { access_token, refresh_token };
    } else {
      const password = randomPassword();
      const newUser = new User({
        email: profile.email,
        password,
        avatar_url: profile.picture,
      });
      const { insertedId } = await databaseService.users.insertOne(newUser);
      const [access_token, refresh_token] = await Promise.all([
        this.signAccessToken({ userId: insertedId.toString() }),
        this.signRefreshToken({ userId: insertedId.toString() }),
      ]);
      return { access_token, refresh_token };
    }
  }
}
export const authService = new AuthService();
