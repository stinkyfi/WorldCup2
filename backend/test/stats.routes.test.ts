import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/createApp.js";

const RUN = Boolean(process.env.DATABASE_URL);

test(
  "GET /api/v1/stats returns { data, meta } with platform fields",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/stats" });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as {
      data: {
        totalValueLockedWei: string;
        activeLeagues: number;
        totalPlayerCount: number;
      };
      meta: { lastUpdatedAt: string };
    };
    assert.equal(typeof body.data.totalValueLockedWei, "string");
    assert.equal(typeof body.data.activeLeagues, "number");
    assert.equal(typeof body.data.totalPlayerCount, "number");
    assert.ok(body.meta.lastUpdatedAt);
    await app.close();
  },
);
