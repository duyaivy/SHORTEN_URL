import { ObjectId } from "mongodb";
import { randomUsername } from "../../common/utils/randoms";

interface UserType {
	_id?: string;
	username?: string;
	email: string;
	password: string;
	avatar_url?: string;
	created_at?: Date;
	updated_at?: Date;
}

export class User {
	_id?: ObjectId;
	username: string;
	email: string;
	password: string;
	created_at: Date;
	avatar_url?: string;
	updated_at: Date;
	constructor({ _id, username, email, password, created_at, updated_at, avatar_url }: UserType) {
		const date = new Date();
		this._id = new ObjectId(_id);
		this.username = randomUsername(email, username);
		this.email = email;
		this.avatar_url = avatar_url;
		this.password = password;
		this.created_at = created_at ? new Date(created_at) : date;
		this.updated_at = updated_at ? new Date(updated_at) : date;
	}
}
export interface RegisterRequest {
	email: string;
	password: string;
}
export interface ResetPasswordRequest {
	password: string;
	token: string;
}
export interface UserProfileResponse {
	id: string;
	email: string;
	verified_email: boolean;
	name: string;
	given_name: string;
	family_name: string;
	picture: string;
}
