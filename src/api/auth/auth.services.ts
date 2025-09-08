import { StatusCodes } from "http-status-codes";
import type { ObjectId } from "mongodb";
import type { StringValue } from "ms";
import { JWTType } from "@/common/constant/enums.const";
import { ServiceResponse } from "@/common/models/serviceResponse";
import type { RegisterRequest } from "@/common/models/user.model";
import databaseService from "@/common/services/database.service";
import { env } from "@/common/utils/envConfig";
import { signJWT, verifyJWT } from "@/common/utils/jwt";

class AuthService {
	async register({ email, password }: RegisterRequest) {
		const userExists = await databaseService.users.findOne({ email });
		if (userExists) {
			throw ServiceResponse.failure("User already exists", null, StatusCodes.BAD_REQUEST);
		}
		const { insertedId } = await databaseService.users.insertOne({ email, password });
		const access_token = this.signAccessToken({ userId: insertedId });
		const refresh_token = this.signRefreshToken({ userId: insertedId });
		return { access_token, refresh_token };
	}
	signAccessToken({ userId }: { userId: ObjectId }) {
		const options = {
			expiresIn: env.ACCESS_TOKEN_EXPIRATION_TIME as StringValue,
		};
		const secretOrPrivateKey = env.PRIVATE_ACCESS_TOKEN_KEY;
		return signJWT({ payload: { userId, type: JWTType.ACCESS_TOKEN }, options, secretOrPrivateKey });
	}
	signRefreshToken({ userId }: { userId: ObjectId }) {
		const options = {
			expiresIn: env.REFRESH_TOKEN_EXPIRATION_TIME as StringValue,
		};
		const secretOrPrivateKey = env.PRIVATE_REFRESH_TOKEN_KEY;
		return signJWT({ payload: { userId, type: JWTType.REFRESH_TOKEN }, options, secretOrPrivateKey });
	}
	async login({ email, password }: RegisterRequest) {
		const user = await databaseService.users.findOne({ email, password });
		if (!user) {
			throw ServiceResponse.failure("Invalid email or password", null, StatusCodes.UNAUTHORIZED);
		}
		const access_token = this.signAccessToken({ userId: user._id });
		const refresh_token = this.signRefreshToken({ userId: user._id });
		return { access_token, refresh_token };
	}
	verifyAccessToken(token: string) {
		const decoded = verifyJWT({ token, secretOrPublicKey: env.PRIVATE_ACCESS_TOKEN_KEY });
		return decoded;
	}
	verifyRefreshToken(token: string) {
		const decoded = verifyJWT({ token, secretOrPublicKey: env.PRIVATE_REFRESH_TOKEN_KEY });
		return decoded;
	}
	async refreshToken({ refresh_token }: { refresh_token: string }) {
		const decoded = this.verifyRefreshToken(refresh_token);
		return { decoded };
	}
}
export const authService = new AuthService();
