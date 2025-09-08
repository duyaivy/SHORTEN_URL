import crypto from "crypto";
export function sha256(content: string) {
	return crypto.createHash("sha256").update(content).digest("hex");
}

export function hashPassword(password: string) {
	return sha256(password + process.env.PRIVATE_PASSWORD);
}
