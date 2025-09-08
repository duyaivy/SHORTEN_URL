import { ObjectId } from "mongodb";

interface RefreshTokenType {
	_id?: string;
	token: string;
	user_id?: string;
	iat: Date;
	exp: Date;
}

export class RefreshToken {
	_id?: ObjectId;
	user_id?: ObjectId;
	token: string;
	iat: Date;
	exp: Date;
	constructor({ _id, user_id, token, iat, exp }: RefreshTokenType) {
		this._id = new ObjectId(_id);
		this.user_id = new ObjectId(user_id);
		this.token = token;
		this.iat = iat;
		this.exp = exp;
	}
}
export interface RefreshTokenRequest {
	refresh_token: string;
}
