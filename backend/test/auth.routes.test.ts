import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { SiweMessage } from "siwe";
import { privateKeyToAccount } from "viem/accounts";
import { createApp } from "../src/createApp.js";
import { prisma } from "../src/db.js";
import { SESSION_COOKIE_NAME } from "../src/routes/v1/auth.js";

const RUN = Boolean(process.env.DATABASE_URL);

/** Hardhat / Anvil default account #0 — dev-only test key. */
const DEV_PK =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

beforeEach(async () => {
  if (!RUN) return;
  const account = privateKeyToAccount(DEV_PK);
  await prisma.admin.deleteMany({ where: { address: account.address } });
});

function parseSessionCookie(setCookie: string | string[] | undefined): string | null {
  if (!setCookie) return null;
  const lines = Array.isArray(setCookie) ? setCookie : [setCookie];
  const prefix = `${SESSION_COOKIE_NAME}=`;
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      const value = line.slice(prefix.length).split(";")[0];
      return value || null;
    }
  }
  return null;
}

test(
  "GET /api/v1/auth/me without cookie returns { data: null }",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const res = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { data: null };
    assert.equal(body.data, null);
    await app.close();
  },
);

test(
  "POST /api/v1/auth/nonce returns nonce for valid address",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const account = privateKeyToAccount(DEV_PK);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/nonce",
      payload: { address: account.address },
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { data: { nonce: string } };
    assert.ok(body.data.nonce.length >= 8);
    await app.close();
  },
);

test(
  "SIWE verify sets session cookie and GET /auth/me returns address",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const account = privateKeyToAccount(DEV_PK);

    const nonceRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/nonce",
      payload: { address: account.address },
    });
    const { nonce } = (JSON.parse(nonceRes.body) as { data: { nonce: string } }).data;

    const siwe = new SiweMessage({
      domain: "localhost:5173",
      address: account.address,
      statement: "Sign in with Ethereum to DegenDraft.",
      uri: "http://localhost:5173",
      version: "1",
      chainId: 84532,
      nonce,
    });
    const message = siwe.prepareMessage();
    const signature = await account.signMessage({ message });

    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify",
      payload: { message, signature },
    });
    assert.equal(verifyRes.statusCode, 200);
    const sid = parseSessionCookie(verifyRes.headers["set-cookie"]);
    assert.ok(sid);

    const meRes = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sid}` },
    });
    assert.equal(meRes.statusCode, 200);
    const me = JSON.parse(meRes.body) as { data: { address: string; chainId: number; isAdmin: boolean } };
    assert.equal(me.data.address.toLowerCase(), account.address.toLowerCase());
    assert.equal(me.data.chainId, 84532);
    assert.equal(me.data.isAdmin, false);

    const out = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sid}` },
    });
    assert.equal(out.statusCode, 200);

    const after = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sid}` },
    });
    const afterBody = JSON.parse(after.body) as { data: null };
    assert.equal(afterBody.data, null);

    await app.close();
  },
);

test(
  "POST /api/v1/auth/verify with wrong signature returns 401",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const account = privateKeyToAccount(DEV_PK);

    const nonceRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/nonce",
      payload: { address: account.address },
    });
    const { nonce } = (JSON.parse(nonceRes.body) as { data: { nonce: string } }).data;

    const siwe = new SiweMessage({
      domain: "localhost:5173",
      address: account.address,
      statement: "Sign in with Ethereum to DegenDraft.",
      uri: "http://localhost:5173",
      version: "1",
      chainId: 84532,
      nonce,
    });
    const message = siwe.prepareMessage();

    const badSig = `0x${"b".repeat(130)}` as `0x${string}`;
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify",
      payload: { message, signature: badSig },
    });
    assert.equal(verifyRes.statusCode, 401);

    await app.close();
  },
);

test(
  "SIWE verify sets isAdmin true when wallet is in admins whitelist for chain",
  { skip: !RUN },
  async () => {
    const account = privateKeyToAccount(DEV_PK);
    await prisma.admin.create({
      data: { address: account.address, chainId: 84532 },
    });
    try {
      const app = await createApp();

      const nonceRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/nonce",
        payload: { address: account.address },
      });
      const { nonce } = (JSON.parse(nonceRes.body) as { data: { nonce: string } }).data;

      const siwe = new SiweMessage({
        domain: "localhost:5173",
        address: account.address,
        statement: "Sign in with Ethereum to DegenDraft.",
        uri: "http://localhost:5173",
        version: "1",
        chainId: 84532,
        nonce,
      });
      const message = siwe.prepareMessage();
      const signature = await account.signMessage({ message });

      const verifyRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/verify",
        payload: { message, signature },
      });
      assert.equal(verifyRes.statusCode, 200);
      const verifyBody = JSON.parse(verifyRes.body) as { data: { isAdmin: boolean } };
      assert.equal(verifyBody.data.isAdmin, true);

      const sid = parseSessionCookie(verifyRes.headers["set-cookie"]);
      assert.ok(sid);
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${sid}` },
      });
      const me = JSON.parse(meRes.body) as { data: { isAdmin: boolean } };
      assert.equal(me.data.isAdmin, true);

      await app.close();
    } finally {
      await prisma.admin.deleteMany({ where: { address: account.address } });
    }
  },
);

test(
  "POST /auth/session-chain clears isAdmin when new chain has no whitelist row",
  { skip: !RUN },
  async () => {
    const prevChains = process.env.SIWE_ALLOWED_CHAIN_IDS;
    process.env.SIWE_ALLOWED_CHAIN_IDS = "84532,84533";

    const account = privateKeyToAccount(DEV_PK);
    await prisma.admin.create({
      data: { address: account.address, chainId: 84532 },
    });

    try {
      const app = await createApp();

      const nonceRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/nonce",
        payload: { address: account.address },
      });
      const { nonce } = (JSON.parse(nonceRes.body) as { data: { nonce: string } }).data;

      const siwe = new SiweMessage({
        domain: "localhost:5173",
        address: account.address,
        statement: "Sign in with Ethereum to DegenDraft.",
        uri: "http://localhost:5173",
        version: "1",
        chainId: 84532,
        nonce,
      });
      const message = siwe.prepareMessage();
      const signature = await account.signMessage({ message });

      const verifyRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/verify",
        payload: { message, signature },
      });
      const sid = parseSessionCookie(verifyRes.headers["set-cookie"]);
      assert.ok(sid);

      const chainRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/session-chain",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${sid}` },
        payload: { chainId: 84533 },
      });
      assert.equal(chainRes.statusCode, 200);
      const chainBody = JSON.parse(chainRes.body) as { data: { chainId: number; isAdmin: boolean } };
      assert.equal(chainBody.data.chainId, 84533);
      assert.equal(chainBody.data.isAdmin, false);

      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${sid}` },
      });
      const me = JSON.parse(meRes.body) as { data: { chainId: number; isAdmin: boolean } };
      assert.equal(me.data.chainId, 84533);
      assert.equal(me.data.isAdmin, false);

      await app.close();
    } finally {
      if (prevChains === undefined) {
        delete process.env.SIWE_ALLOWED_CHAIN_IDS;
      } else {
        process.env.SIWE_ALLOWED_CHAIN_IDS = prevChains;
      }
      await prisma.admin.deleteMany({ where: { address: account.address } });
    }
  },
);

test(
  "GET /api/v1/admin/health returns 403 for authenticated non-admin",
  { skip: !RUN },
  async () => {
    const app = await createApp();
    const account = privateKeyToAccount(DEV_PK);

    const nonceRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/nonce",
      payload: { address: account.address },
    });
    const { nonce } = (JSON.parse(nonceRes.body) as { data: { nonce: string } }).data;
    const siwe = new SiweMessage({
      domain: "localhost:5173",
      address: account.address,
      statement: "Sign in with Ethereum to DegenDraft.",
      uri: "http://localhost:5173",
      version: "1",
      chainId: 84532,
      nonce,
    });
    const message = siwe.prepareMessage();
    const signature = await account.signMessage({ message });
    const verifyRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/verify",
      payload: { message, signature },
    });
    const sid = parseSessionCookie(verifyRes.headers["set-cookie"]);
    assert.ok(sid);

    const adminRes = await app.inject({
      method: "GET",
      url: "/api/v1/admin/health",
      headers: { cookie: `${SESSION_COOKIE_NAME}=${sid}` },
    });
    assert.equal(adminRes.statusCode, 403);

    await app.close();
  },
);

test(
  "GET /api/v1/admin/health returns 200 for admin session",
  { skip: !RUN },
  async () => {
    const account = privateKeyToAccount(DEV_PK);
    await prisma.admin.create({
      data: { address: account.address, chainId: 84532 },
    });
    try {
      const app = await createApp();

      const nonceRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/nonce",
        payload: { address: account.address },
      });
      const { nonce } = (JSON.parse(nonceRes.body) as { data: { nonce: string } }).data;
      const siwe = new SiweMessage({
        domain: "localhost:5173",
        address: account.address,
        statement: "Sign in with Ethereum to DegenDraft.",
        uri: "http://localhost:5173",
        version: "1",
        chainId: 84532,
        nonce,
      });
      const message = siwe.prepareMessage();
      const signature = await account.signMessage({ message });
      const verifyRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/verify",
        payload: { message, signature },
      });
      const sid = parseSessionCookie(verifyRes.headers["set-cookie"]);
      assert.ok(sid);

      const adminRes = await app.inject({
        method: "GET",
        url: "/api/v1/admin/health",
        headers: { cookie: `${SESSION_COOKIE_NAME}=${sid}` },
      });
      assert.equal(adminRes.statusCode, 200);

      await app.close();
    } finally {
      await prisma.admin.deleteMany({ where: { address: account.address } });
    }
  },
);
