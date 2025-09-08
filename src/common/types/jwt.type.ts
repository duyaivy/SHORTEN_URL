import type { JsonWebTokenError, NotBeforeError, TokenExpiredError } from "jsonwebtoken";
import type { ObjectId } from "mongodb";
import type { JWTType } from "../constant/enums.const";

export type JWTError = JsonWebTokenError | NotBeforeError | TokenExpiredError;
export interface TokenPayLoad {
	userId: ObjectId;
	type: JWTType;
	iat: number;
	exp: number;
}
