import { env } from "@/common/utils/envConfig";
import databaseService from "../services/database.service";
import Agenda from "agenda";

const agenda = new Agenda({
  db: { address: env.DB_CONNECTION_STRING, collection: "agendaJobs" },
});

/**
 * Job: Xoá các URL hết hạn
 */
agenda.define("delete expired urls", async () => {
  const now = new Date();
  const result = await databaseService.urls.deleteMany({
    exp: { $ne: null, $lte: now },
  });

  console.log(
    `[Agenda] Deleted ${
      result.deletedCount
    } expired URLs at ${now.toISOString()}`
  );
});

export const setupAgenda = async () => {
  await agenda.start();

  await agenda.cancel({ name: "delete expired urls" });

  // Lên lịch chạy mỗi ngày lúc 00:00
  await agenda.every(
    "0 0 * * *",
    "delete expired urls",
    {},
    { timezone: "Asia/Ho_Chi_Minh" }
  );

  console.log('[Agenda] Job "delete expired urls" scheduled at 00:00 daily');
};

export default agenda;
