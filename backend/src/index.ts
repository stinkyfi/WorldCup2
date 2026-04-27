import "dotenv/config";
import { config } from "./config.js";
import { createApp } from "./createApp.js";

const app = await createApp();

await app.listen({ port: config.port, host: "0.0.0.0" });
app.log.info(`API listening on http://0.0.0.0:${config.port}`);
