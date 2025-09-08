import { ObjectId } from "mongodb";
import { randomUsername } from "../utils/randoms";

interface UserType {
	_id?: string;
	username: string;
	email: string;
	password: string;
}

export class User {
	_id?: ObjectId;
	username?: string;
	email: string;
	password: string;
	constructor({ _id, username, email, password }: UserType) {
		this._id = new ObjectId(_id);
		this.username = randomUsername(username, email);
		this.email = email;
		this.password = password;
	}
}
export interface RegisterRequest {
	email: string;
	password: string;
}
