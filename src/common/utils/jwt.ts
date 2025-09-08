import { type Algorithm, type JwtPayload, type Secret, type SignOptions, sign, verify } from "jsonwebtoken";
import _ from "lodash";
import type { StringValue } from "ms";
import { ServiceResponse } from "../models/serviceResponse";
import type { JWTError } from "../types/jwt.type";
import { env } from "./envConfig";

interface SignJWTParams {
	payload: JwtPayload;
	secretOrPrivateKey?: Secret;
	options?: SignOptions;
}

export const signJWT = ({
	payload,
	secretOrPrivateKey = env.SECRET_OR_PUBLIC_JWT_KEY,
	options = {
		algorithm: env.ALGORITHM_JWT as Algorithm,
		expiresIn: env.EXP_TIME as StringValue,
	},
}: SignJWTParams): string => {
	const token = sign(payload, secretOrPrivateKey, { algorithm: env.ALGORITHM_JWT as Algorithm, ...options });
	return token;
};
export const verifyJWT = ({
	token,
	secretOrPublicKey = env.SECRET_OR_PUBLIC_JWT_KEY,
}: {
	token: string;
	secretOrPublicKey?: Secret;
}) => {
	try {
		return verify(token, secretOrPublicKey);
	} catch (err) {
		throw ServiceResponse.failure(_.capitalize((err as JWTError).message), null, 401);
	}
};
