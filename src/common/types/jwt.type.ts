import type { JsonWebTokenError, NotBeforeError, TokenExpiredError } from "jsonwebtoken";
import type { JWTType } from "../constant/enums.const";

export type JWTError = JsonWebTokenError | NotBeforeError | TokenExpiredError;
export interface TokenPayLoad {
	userId: string;
	type: JWTType;
	iat: number;
	exp: number;
}
