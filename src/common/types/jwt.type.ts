import type { JsonWebTokenError, NotBeforeError, TokenExpiredError } from "jsonwebtoken";

export type JWTError = JsonWebTokenError | NotBeforeError | TokenExpiredError;
