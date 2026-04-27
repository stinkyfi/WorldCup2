import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/createApp.js";

test("GET /api/v1/health returns { data, meta } envelope", async () => {
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/api/v1/health" });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body) as { data: { status: string }; meta: Record<string, unknown> };
  assert.ok(body.data);
  assert.ok("meta" in body);
  assert.equal(body.data.status, "ok");
  await app.close();
});
