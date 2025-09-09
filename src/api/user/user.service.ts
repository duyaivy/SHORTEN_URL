import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { omit } from "lodash";
import { ObjectId } from "mongodb";
import { AUTH_MESSAGES } from "@/common/constant/message.const";
import { ServiceResponse } from "@/common/models/serviceResponse";
import databaseService from "@/common/services/database.service";
import { env } from "@/common/utils/envConfig";
import { randomPassword } from "@/common/utils/randoms";
import { authService } from "../auth/auth.service";
import type { User, UserProfileResponse } from "./user.model";

class UserService {
	async findById(userId: string) {
		const user = await databaseService.users.findOne({ _id: new ObjectId(userId) });
		if (!user) {
			throw ServiceResponse.failure(AUTH_MESSAGES.USER_NOT_FOUND, null, StatusCodes.NOT_FOUND);
		}
		return omit(user, ["password"]);
	}
	async getOauthGoogleToken(code: string) {
		const body = {
			code,
			client_id: env.GOOGLE_CLIENT_ID,
			client_secret: env.GOOGLE_CLIENT_SECRET,
			redirect_uri: env.GOOGLE_REDIRECT_URI,
			grant_type: "authorization_code",
		};
		const { data } = await axios.post("https://oauth2.googleapis.com/token", body, {
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});
		return data;
	}
	async getOauthGoogleProfile(access_token: string, id_token: string): Promise<UserProfileResponse> {
		const { data } = await axios.get("https://www.googleapis.com/oauth2/v1/userinfo", {
			params: {
				access_token,
				alt: "json",
			},
			headers: {
				Authorization: `Bearer ${id_token}`,
			},
		});
		return data;
	}
	getUserByEmail(email: string): Promise<User | null> {
		return databaseService.users.findOne({ email });
	}
	async googleOauth(code: string) {
		// Handle Google OAuth login logic here
		const { id_token, access_token } = await this.getOauthGoogleToken(code);
		if (!id_token || !access_token) {
			throw ServiceResponse.failure(AUTH_MESSAGES.FAILED_TO_FETCH_GOOGLE_TOKEN, null, StatusCodes.BAD_REQUEST);
		}
		const profile = await this.getOauthGoogleProfile(access_token, id_token);
		if (!profile.verified_email) {
			throw ServiceResponse.failure(AUTH_MESSAGES.EMAIL_NOT_VERIFIED, null, StatusCodes.BAD_REQUEST);
		}

		const user = await this.getUserByEmail(profile.email);
		if (user) {
			const data = await authService.login(user);
			return data;
		} else {
			const password = randomPassword();
			const data = await authService.register({
				email: profile.email,
				password,
			});
			return data;
		}
	}
}
export const userService = new UserService();
