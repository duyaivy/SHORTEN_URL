import { StatusCodes } from "http-status-codes";
import { type Algorithm, type JwtPayload, type Secret, type SignOptions, sign, verify } from "jsonwebtoken";
import _ from "lodash";
import { ServiceResponse } from "../models/serviceResponse";
import type { JWTError, TokenPayLoad } from "../types/jwt.type";
import { env } from "./envConfig";

interface SignJWTParams {
	payload: JwtPayload;
	secretOrPrivateKey?: Secret;
	options?: SignOptions;
}

export const signJWT = ({ payload, secretOrPrivateKey = env.SECRET_OR_PUBLIC_JWT_KEY, options }: SignJWTParams) => {
	return new Promise<string>((resolve, reject) => {
		sign(payload, secretOrPrivateKey, { algorithm: env.ALGORITHM_JWT as Algorithm, ...options }, (err, token) => {
			if (err) {
				reject(ServiceResponse.failure(_.capitalize(err.message), null, StatusCodes.INTERNAL_SERVER_ERROR));
			} else {
				resolve(token as string);
			}
		});
	});
};
export const verifyJWT = ({
	token,
	secretOrPublicKey = env.SECRET_OR_PUBLIC_JWT_KEY,
}: {
	token: string;
	secretOrPublicKey?: Secret;
}) => {
	// try {
	// 	return verify(token, secretOrPublicKey) as TokenPayLoad;
	// } catch (err) {
	// 	throw ServiceResponse.failure(_.capitalize((err as JWTError).message), null, 401);
	// }
	return new Promise<TokenPayLoad>((resolve, reject) => {
		verify(token, secretOrPublicKey, (err, decoded) => {
			if (err) {
				reject(ServiceResponse.failure(_.capitalize((err as JWTError).message), null, StatusCodes.UNAUTHORIZED));
			} else {
				resolve(decoded as TokenPayLoad);
			}
		});
	});
};
