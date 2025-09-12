import { env } from "./envConfig";

export const getUrlFromAlias = (alias: string) => {
	if (env.isDevelopment) {
		return `http://${env.HOST}:${env.PORT}/${alias}`;
	}
	return `https://${env.HOST}/${alias}`;
};
