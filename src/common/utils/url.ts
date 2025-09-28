import { env } from "./envConfig";

export const getUrlFromAlias = (alias: string) => {
	return `${env.CLIENT_SHORT_LINK}/${alias}`;
};
