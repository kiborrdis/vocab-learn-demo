import "dotenv/config";
import express from "express";
import { initializeBot } from "./bot/initialize";
import { PrismaClient } from "@prisma/client";
import { createBaseServices, ensureDictionariesExist } from "./services";
import cookieParser from "cookie-parser";
import { registerAuthTelegramRoute } from "./httpHandlers/authTelegram";
import { registerInfoRoute, registerVocabularyCountRoute } from "./httpHandlers/info";
import { registerTrainingSetRoute } from "./httpHandlers/trainingSet";
import { registerTrainingSetMarkRoute } from "./httpHandlers/trainingSetMark";
import { registerIdentityRoute } from "./httpHandlers/identity";
import { registerDefinitionsUpdateRoute } from "./httpHandlers/updateDefinitions";
import { registerAddWordRoute } from "./httpHandlers/addWord";

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

function baseUncaughtHandler(error: Error) {
  console.log("uncaughtException", "error", error, error.stack);
  process.exit(1);
}

function baseUnhandledHandler(error: Error) {
  console.log("unhandledRejection", "error", error, error.stack);
  process.exit(1);
}

process.on("uncaughtException", baseUncaughtHandler);
process.on("unhandledRejection", baseUnhandledHandler);

const startup = async () => {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log("No TELEGRAM_BOT_TOKEN is set");
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    console.log("No GEMINI_API_KEY is set");
  }

  const services = createBaseServices(prisma);

  await ensureDictionariesExist(prisma);

  const botKit = await initializeBot(process.env.TELEGRAM_BOT_TOKEN, services);

  botKit.bot.launch();

  const app = express();
  const port = PORT;

  app.use(cookieParser());
  app.use(express.json());

  // Register routes
  registerAuthTelegramRoute(app, services.users);
  registerInfoRoute(app, prisma);
  registerTrainingSetRoute(app, prisma, services);
  registerTrainingSetMarkRoute(app, prisma, services);
  registerIdentityRoute(app, prisma);
  registerVocabularyCountRoute(app, prisma);
  registerDefinitionsUpdateRoute(app, prisma, services);
  registerAddWordRoute(app, prisma, services);

  app.get("/", (_, res) => {
    res.send("I'm working");
  });

  app.listen(port, () => {
    console.log(`Server Listening on Port ${port}`);
  });
};

startup().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
