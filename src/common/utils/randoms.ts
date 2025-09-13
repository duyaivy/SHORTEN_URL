import { nanoid } from "nanoid";
import { env } from "./envConfig";
export const randomUsername = (email: string, name?: string) => {
	if (name) {
		return name;
	}
	return email.substring(0, 3) + nanoid(6);
};
export const randomPassword = () => {
	return nanoid(8) + env.PRIVATE_PASSWORD;
};
