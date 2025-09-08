import { createId } from "crypto-id";
export const randomUsername = (name: string, email: string) => {
	if (name) {
		return name;
	}
	return email.substring(0, 5) + createId(6);
};
