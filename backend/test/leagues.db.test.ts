import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/createApp.js";

const RUN = process.env.RUN_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);

test(
  "POST /api/v1/leagues persists SQL-like title using parameterized queries only",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const title = "' OR 1=1 --";
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/leagues",
      payload: { chainId: 84532, title },
      headers: { "content-type": "application/json" },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body) as { data: { league: { id: string; title: string } } };
    assert.equal(body.data.league.title, title);
    await app.close();
  },
);
