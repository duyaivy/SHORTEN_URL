
export interface GoogleProfile{
    email: string;
    name: string;
    picture: string;
    gender: string;
    verified_email: boolean;
}
export abstract class GoogleOAuth {
    abstract getGoogleOAuthToken(code: string): Promise<{id_token: string, access_token: string}>;
    abstract getGoogleUserProfile(token: string, id_token: string): Promise<GoogleProfile>;
}