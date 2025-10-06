import axios from "axios";
import { env } from "./envConfig";

export const getUrlFromAlias = (alias: string) => {
	return `${env.CLIENT_SHORT_LINK}/${alias}`;
};

export const  getOauthGoogleToken = async(code: string)=> {
	const body = {
		code,
		client_id: env.GOOGLE_CLIENT_ID,
		client_secret: env.GOOGLE_CLIENT_SECRET,
		redirect_uri: env.GOOGLE_REDIRECT_URI,
		grant_type: "authorization_code",
	};
	const response = await axios.post("https://oauth2.googleapis.com/token", body, {
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
	});

	
	return response.data;
}
export const  getOauthGoogleProfile = async (access_token: string, id_token: string)=> {
	const response = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`, {
		headers: {
			Authorization: `Bearer ${id_token}`,
		},
	});
	return response.data;
}