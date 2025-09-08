import { type Collection, type Db, MongoClient } from "mongodb";
import { env } from "@/common/utils/envConfig";
import type { RefreshToken } from "../models/refreshToken.model";
import type { User } from "../models/user.model";

class DBService {
	private client: MongoClient;
	private db: Db;
	constructor() {
		this.client = new MongoClient(env.DB_CONNECTION_STRING);
		this.db = this.client.db(env.DB_NAME);
	}
	async connect() {
		try {
			await this.db.command({ ping: 1 });
			console.log("Pinged your deployment. You successfully connected to MongoDB!");
		} catch (error) {
			console.log("error", error);
			throw error;
		}
	}
	async indexUser() {
		try {
			const existIndex = await this.users.indexExists(["email_1", "email_1_password_1", "username_1"]);
			if (existIndex) {
				console.log("User indexes already exist");
			} else {
				await Promise.all([
					this.users.createIndex({ email: 1, password: 1 }, { unique: true }),
					this.users.createIndex({ email: 1 }, { unique: true }),
					this.users.createIndex({ username: 1 }, { unique: true }),
				]);
				console.log("User indexes created successfully");
			}
		} catch (error) {
			console.log("Error creating user indexes:", error);
		}
	}

	get users(): Collection<User> {
		return this.db.collection(env.DB_USER_COLLECTION);
	}
	get refresh_tokens(): Collection<RefreshToken> {
		return this.db.collection(env.DB_REFRESH_TOKEN_COLLECTION);
	}
}

const databaseService = new DBService();
export default databaseService;
