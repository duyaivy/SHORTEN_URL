import * as express from "express";
import type { TokenPayLoad } from "./common/types/jwt.type";

declare global {
	namespace Express {
		interface Request {
			decode_token_payload?: TokenPayLoad;
		}
	}
}
