import { ObjectId } from "mongodb";
import { randomUsername } from "../utils/randoms";

interface UserType {
	_id?: string;
	username?: string;
	email: string;
	password: string;
	created_at?: Date;
	updated_at?: Date;
}

export class User {
	_id?: ObjectId;
	username: string;
	email: string;
	password: string;
	created_at: Date;
	updated_at: Date;
	constructor({ _id, username, email, password, created_at, updated_at }: UserType) {
		const date = new Date();
		this._id = new ObjectId(_id);
		this.username = randomUsername(email, username);
		this.email = email;
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
