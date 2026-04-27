import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/createApp.js";

test("POST /api/v1/leagues with invalid body returns { error, code } envelope", async () => {
  const app = await createApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/leagues",
    payload: {},
    headers: { "content-type": "application/json" },
  });
  assert.equal(res.statusCode, 422);
  const body = JSON.parse(res.body) as { error: string; code: string };
  assert.equal(body.code, "VALIDATION_ERROR");
  assert.ok(typeof body.error === "string" && body.error.length > 0);
  await app.close();
});
