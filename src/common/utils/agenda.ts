import { env } from "@/common/utils/envConfig";
import databaseService from "../services/database.service";
import Agenda from "agenda";
import { urlService } from "@/api/url/url.service";
import { authService } from "@/api/auth/auth.service";

const agenda = new Agenda({
  db: { address: env.DB_CONNECTION_STRING, collection: "agendaJobs" },
});

/**
 * Job: Xoá các URL hết hạn
 */
agenda.define("delete expired urls, refresh tokens", async () => {
  const now = new Date();
  const urlResults = await databaseService.urls
    .find({
      exp: { $ne: null, $lte: now },
    })
    .toArray();
  const deleteIds = urlResults.map((i) => i._id.toString());

  const refreshTokens = await databaseService.refresh_tokens
    .find({
      exp: { $ne: null as any, $lte: now },
    })
    .toArray();
  const deleteTokenIds = refreshTokens.map((i) => i._id.toString());
  const [isSuccess, isSuccessUrl] = await Promise.all([
    urlService.deleteURLsAgenda(deleteIds),
    authService.deleteRefreshTokensAgenda(deleteTokenIds),
  ]);
  const isDeleteSuccess = isSuccess && isSuccessUrl;
  console.log(
    `[Agenda] ${isDeleteSuccess}: Deleted expired URLs at ${now.toISOString()}`
  );
});

export const setupAgenda = async () => {
  await agenda.start();

  await agenda.cancel({ name: "delete expired urls, refresh tokens" });

  // Lên lịch chạy mỗi ngày lúc 00:00
  await agenda.every(
    "0 0 * * *",
    "delete expired urls, refresh tokens",
    {},
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  console.log(
    '[Agenda] Job "delete expired urls, refresh tokens" scheduled at 00:00 daily'
  );
};

export default agenda;
