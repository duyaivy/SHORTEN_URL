import { StatusCodes } from "http-status-codes";
import { type Collection, type Db, MongoClient } from "mongodb";
import request from "supertest";
import { env } from "@/common/utils/envConfig";
import { hashPassword } from "@/common/utils/hashPassword";
import { app } from "@/server";
import { User } from "../user.model";

let client: MongoClient;
let db: Db;
let users: Collection;
let token: string;

describe("Integration Test - GET /user/get-me", () => {
	beforeAll(async () => {
		// 1. Kết nối DB test
		client = new MongoClient(env.DB_CONNECTION_STRING);
		await client.connect();
		db = client.db(env.DB_NAME);
		users = db.collection(env.DB_USER_COLLECTION);

		// 2. Xoá user cũ (nếu có) rồi seed user mới
		await users.deleteMany({ email: "test-user@mail.com" });
		await users.insertOne(
			new User({
				email: "test-user@mail.com",
				username: "test123",
				password: hashPassword("test@1234"),
			}),
		);

		// 3. Lấy JWT token qua /auth/login
		const loginRes = await request(app)
			.post("/auth/login")
			.send({ email: "test-user@mail.com", password: "test@1234" });

		expect(loginRes.statusCode).toBe(StatusCodes.OK);
		token = loginRes.body.data.access_token;
	});

	afterAll(async () => {
		// Dọn dữ liệu và đóng DB
		await users.deleteMany({ email: "test-user@mail.com" });
		await client.close();
	});

	it("should return current user when valid token is provided", async () => {
		const res = await request(app)
			.get("/user/get-me") // ⬅ đổi về đúng route
			.set("Authorization", `Bearer ${token}`);

		expect(res.statusCode).toBe(StatusCodes.OK);
		expect(res.body.success).toBe(true);
		expect(res.body.data.email).toBe("test-user@mail.com");
		expect(res.body.data.username).toBe("test123");
		expect(res.body.data).not.toHaveProperty("password");
	});

	it("should return 401 when token is missing", async () => {
		const res = await request(app).get("/user/get-me");

		expect(res.statusCode).toBe(StatusCodes.UNAUTHORIZED);
		expect(res.body.success).toBe(false);
	});

	it("should return 401 when token is invalid", async () => {
		const res = await request(app).get("/user/get-me").set("Authorization", "Bearer fake token");

		expect(res.statusCode).toBe(StatusCodes.UNAUTHORIZED);
		expect(res.body.success).toBe(false);
	});
});
