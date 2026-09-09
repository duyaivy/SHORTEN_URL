import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleOAuth, GoogleProfile } from "../application/ports/google-oauth";
import axios from "axios";
import { EnvironmentVariables } from "../../../shared/config/env.validation";

@Injectable()
export class GoogleOauthClient implements GoogleOAuth {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async getGoogleOAuthToken(code: string): Promise<{
    id_token: string;
    access_token: string;
  }> {
    const url = "https://oauth2.googleapis.com/token";
    const values = {
      client_id: this.configService.get("GOOGLE_CLIENT_ID", { infer: true }) || "",
      client_secret: this.configService.get("GOOGLE_CLIENT_SECRET", { infer: true }) || "",
      code: code,
      redirect_uri: this.configService.get("GOOGLE_REDIRECT_URI", { infer: true }) || "",
      grant_type: "authorization_code",
    };

    try {
      const response = await axios.post(
        url,
        new URLSearchParams(values).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Google OAuth Token Error Details:", error.response.data);
        throw new Error(
          `Google Token Request Failed: ${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }

  async getGoogleUserProfile(access_token: string, id_token: string): Promise<GoogleProfile> {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`,
        {
          headers: {
            Authorization: `Bearer ${id_token}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        console.error("Google User Profile Error Details:", error.response.data);
        throw new Error(
          `Google Profile Request Failed: ${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}