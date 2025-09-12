import { createId } from "crypto-id";
import { env } from "./envConfig";
export const randomUsername = (email: string, name?: string) => {
	if (name) {
		return name;
	}
	return email.substring(0, 3) + createId(6);
};
export const randomPassword = () => {
	return createId(8) + env.PRIVATE_PASSWORD;
};
