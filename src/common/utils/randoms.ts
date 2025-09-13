import { v4 as uuidv4 } from "uuid";

export const randomUsername = (email: string, name?: string) => {
	if (name) return name;
	return email.substring(0, 3) + uuidv4().slice(0, 5);
};

export const randomPassword = () => {
	return uuidv4().replace(/-/g, "").slice(0, 8);
};
