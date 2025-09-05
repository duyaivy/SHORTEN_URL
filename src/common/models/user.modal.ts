import { ObjectId } from "mongodb";

interface UserType {
	_id?: string;
	username: string;
	email: string;
	password: string;
}

export class User {
	_id: ObjectId;
	username: string;
	email: string;
	password: string;
	constructor({ _id, username, email, password }: UserType) {
		this._id = new ObjectId(_id);
		this.username = username;
		this.email = email;
		this.password = password;
	}
}
