import { StatusCodes } from "http-status-codes";
import type { ObjectId } from "mongodb";
import type { StringValue } from "ms";
import { JWTType } from "@/common/constant/enums.const";
import { AUTH_MESSAGES } from "@/common/constant/message.const";
import { RefreshToken } from "@/common/models/refreshToken.model";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { type RegisterRequest, User } from "@/common/models/user.model";
import databaseService from "@/common/services/database.service";
import type { TokenPayLoad } from "@/common/types/jwt.type";
import { env } from "@/common/utils/envConfig";
import { signJWT, verifyJWT } from "@/common/utils/jwt";

class AuthService {
	async register({ email, password }: RegisterRequest) {
		const userExists = await databaseService.users.findOne({ email });
		if (userExists) {
			throw ServiceResponse.failure("User already exists", null, StatusCodes.BAD_REQUEST);
		}
		const { insertedId } = await databaseService.users.insertOne(new User({ email, password }));
		const [access_token, refresh_token] = await Promise.all([
			this.signAccessToken({ userId: insertedId }),
			this.signRefreshToken({ userId: insertedId }),
		]);
		return { access_token, refresh_token };
	}
	async signAccessToken({ userId }: { userId: ObjectId }) {
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
	async signRefreshToken({ userId, exp }: { userId: ObjectId; exp?: number }) {
		const options = exp
			? undefined
			: {
					expiresIn: env.REFRESH_TOKEN_EXPIRATION_TIME as StringValue,
				};

		const secretOrPrivateKey = env.PRIVATE_REFRESH_TOKEN_KEY;
		const payload = exp ? { userId, type: JWTType.REFRESH_TOKEN, exp } : { userId, type: JWTType.REFRESH_TOKEN };
		const token = await signJWT({ payload, options, secretOrPrivateKey });
		// decode & save to db
		const { iat, exp: expTime } = await this.verifyRefreshToken(token);
		await databaseService.refresh_tokens.insertOne(
			new RefreshToken({
				user_id: userId.toString(),
				token,
				iat: new Date(iat * 1000),
				exp: new Date(expTime * 1000),
			}),
		);
		return token;
	}
	async login({ email, password }: RegisterRequest) {
		const user = await databaseService.users.findOne({ email, password });
		if (!user) {
			throw ServiceResponse.failure(AUTH_MESSAGES.WRONG_EMAIL_OR_PASSWORD, null, StatusCodes.UNAUTHORIZED);
		}
		const access_token = await this.signAccessToken({ userId: user._id });
		const refresh_token = await this.signRefreshToken({ userId: user._id });
		return { access_token, refresh_token };
	}
	async verifyAccessToken(token: string): Promise<TokenPayLoad> {
		const decoded = await verifyJWT({ token, secretOrPublicKey: env.PRIVATE_ACCESS_TOKEN_KEY });
		return decoded;
	}
	async verifyRefreshToken(token: string): Promise<TokenPayLoad> {
		const decoded = await verifyJWT({ token, secretOrPublicKey: env.PRIVATE_REFRESH_TOKEN_KEY });
		return decoded;
	}
	async refreshToken({ payload, token }: { payload: TokenPayLoad; token: string }) {
		const access_token = await this.signAccessToken({ userId: payload.userId });
		const refresh_token = await this.signRefreshToken({ userId: payload.userId, exp: payload.exp });
		await databaseService.refresh_tokens.findOneAndDelete({ token: token });
		return { access_token, refresh_token };
	}
}
export const authService = new AuthService();
