import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../src/createApp.js";

test("GET /league/:invalid returns HTML with generic Open Graph tags", async () => {
  const app = await createApp();
  const res = await app.inject({ method: "GET", url: "/league/not-a-valid-address" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"]?.split(";")[0], "text/html");
  assert.ok(res.payload.includes('property="og:title"'));
  assert.ok(res.payload.includes('property="og:description"'));
  assert.ok(res.payload.includes('property="og:url"'));
  assert.ok(res.payload.includes('property="og:image"'));
  assert.ok(res.payload.includes("WorldCup2"));
  await app.close();
});

test("GET /league/:validFormatMissingLeague returns HTML with generic OG", async () => {
  const app = await createApp();
  const res = await app.inject({
    method: "GET",
    url: "/league/0x9999999999999999999999999999999999999999",
  });
  assert.equal(res.statusCode, 200);
  assert.ok(res.payload.includes('property="og:title"'));
  assert.ok(res.payload.includes("WorldCup2"));
  await app.close();
});
