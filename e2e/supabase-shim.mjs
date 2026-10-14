// TEST HARNESS ONLY. Never deployed.
//
// A small local stand-in for the three Supabase services the site uses (REST, Auth,
// Storage), so the end-to-end tests can run without Docker or a cloud project.
// It is deliberately thin: every database query runs in real Postgres under the same
// role (anon / authenticated / service_role) and JWT claim that Supabase would set,
// so the row-level security policies being exercised are the real ones.
// It implements only the subset of the PostgREST and GoTrue APIs this app calls.
//
// Usage: node e2e/supabase-shim.mjs   (reads SHIM_* env vars, see below)

import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const PORT = Number(process.env.SHIM_PORT ?? 54321);
const JWT_SECRET = process.env.SHIM_JWT_SECRET ?? "test-only-secret-test-only-secret!!";
const STORAGE_DIR = process.env.SHIM_STORAGE_DIR ?? path.join(process.env.TMPDIR ?? "/tmp", "satchel-e2e-run", "storage");
// PostgREST returns numeric columns as JSON numbers; match it.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// PostgREST returns dates as plain YYYY-MM-DD strings.
pg.types.setTypeParser(1082, (v) => v);
// PostgREST returns timestamptz as ISO strings.
pg.types.setTypeParser(1184, (v) => (v === null ? null : new Date(v).toISOString()));
const pool = new pg.Pool({ connectionString: process.env.SHIM_DATABASE_URL });

// Mirrors supabase/migrations/20261012000100_storage.sql
const BUCKET = { id: "media", maxBytes: 15 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "image/avif"] };

// ── JWT (HS256) ────────────────────────────────────────
const b64u = (b) => Buffer.from(b).toString("base64url");
export function sign(payload) {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}
function verify(token) {
  if (!token) return null;
  const [h, b, s] = token.split(".");
  if (!s) return null;
  const expect = crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${b}`).digest("base64url");
  if (expect.length !== s.length || !crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(s))) return null;
  const claims = JSON.parse(Buffer.from(b, "base64url").toString());
  if (claims.exp && claims.exp < Date.now() / 1000) return null;
  return claims;
}
export const ANON_KEY = sign({ role: "anon", iss: "shim" });
export const SERVICE_KEY = sign({ role: "service_role", iss: "shim" });

// ── helpers ────────────────────────────────────────────
const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (s) => {
  if (!IDENT.test(s)) throw httpError(400, "PGRST100", `bad identifier ${s}`);
  return `"${s}"`;
};
function httpError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...headers });
  res.end(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body));
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}
function claimsFrom(req) {
  const auth = req.headers.authorization?.replace(/^Bearer /i, "") ?? req.headers.apikey;
  return verify(auth) ?? { role: "anon" };
}
async function asRole(claims, fn) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const role = ["anon", "authenticated", "service_role"].includes(claims.role) ? claims.role : "anon";
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)", [
      claims.sub ?? "",
      JSON.stringify(claims),
    ]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
function pgStatus(e, claims) {
  if (e.status) return e.status;
  if (e.code === "23505") return 409;
  if (e.code === "42501") return claims.role === "anon" ? 401 : 403;
  if (["23514", "22P02", "23502", "22001", "P0001", "23503"].includes(e.code)) return 400;
  return 500;
}

// ── PostgREST subset ───────────────────────────────────
function parseFilters(params) {
  const where = [];
  const values = [];
  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
    const m = raw.match(/^(eq|neq|is|ilike|like|in|gt|gte|lt|lte)\.(.*)$/s);
    if (!m) throw httpError(400, "PGRST100", `bad filter ${key}`);
    const [, op, v] = m;
    const col = ident(key);
    if (op === "is") {
      if (!["null", "true", "false"].includes(v)) throw httpError(400, "PGRST100", "bad is");
      where.push(`${col} is ${v}`);
    } else if (op === "in") {
      const items = v.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""));
      values.push(items);
      where.push(`${col}::text = any($${values.length}::text[])`);
    } else {
      const sqlOp = { eq: "=", neq: "<>", ilike: "ilike", like: "like", gt: ">", gte: ">=", lt: "<", lte: "<=" }[op];
      values.push(op === "ilike" || op === "like" ? v.replace(/\*/g, "%") : v);
      where.push(`${col}::text ${sqlOp} $${values.length}`);
    }
  }
  return { where: where.length ? `where ${where.join(" and ")}` : "", values };
}
const selectList = (s) => (!s || s === "*" ? "*" : s.split(",").map((c) => ident(c.trim())).join(", "));
function orderBy(o) {
  if (!o) return "";
  return (
    "order by " +
    o
      .split(",")
      .map((part) => {
        const [col, dir, nulls] = part.split(".");
        return `${ident(col)} ${dir === "desc" ? "desc" : "asc"}${nulls === "nullsfirst" ? " nulls first" : nulls === "nullslast" ? " nulls last" : ""}`;
      })
      .join(", ")
  );
}

async function rest(req, res, url) {
  const claims = claimsFrom(req);
  const [, , , name, fn] = url.pathname.split("/"); // /rest/v1/<table> or /rest/v1/rpc/<fn>
  const params = url.searchParams;
  const prefer = req.headers.prefer ?? "";
  const wantsObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const body = ["POST", "PATCH"].includes(req.method) ? JSON.parse((await readBody(req)).toString() || "{}") : null;

  try {
    const result = await asRole(claims, async (db) => {
      if (name === "rpc") {
        const args = Object.keys(body ?? {});
        const sql = `select ${ident(fn)}(${args.map((a, i) => `${ident(a)} => $${i + 1}`).join(", ")}) as r`;
        const { rows } = await db.query(sql, args.map((a) => body[a]));
        return { rows: rows[0].r, scalar: true };
      }
      const table = `public.${ident(name)}`;
      const { where, values } = parseFilters(params);
      const cols = selectList(params.get("select"));
      if (req.method === "GET" || req.method === "HEAD") {
        const limit = params.get("limit") ? `limit ${Number(params.get("limit"))}` : "";
        const { rows } = await db.query(`select ${cols} from ${table} ${where} ${orderBy(params.get("order"))} ${limit}`, values);
        let count = null;
        if (/count=exact/.test(prefer)) count = Number((await db.query(`select count(*) from ${table} ${where}`, values)).rows[0].count);
        return { rows, count };
      }
      if (req.method === "POST") {
        const items = Array.isArray(body) ? body : [body];
        const out = [];
        for (const item of items) {
          const keys = Object.keys(item);
          const sql = `insert into ${table} (${keys.map(ident).join(", ")})
            select ${keys.map((k) => `r.${ident(k)}`).join(", ")} from jsonb_populate_record(null::${table}, $1) r
            returning ${cols}`;
          out.push(...(await db.query(sql, [JSON.stringify(item)])).rows);
        }
        return { rows: out, created: true };
      }
      if (req.method === "PATCH") {
        const keys = Object.keys(body);
        const offset = values.length;
        const sets = keys.map((k) => `${ident(k)} = (jsonb_populate_record(null::${table}, $${offset + 1})).${ident(k)}`).join(", ");
        const { rows } = await db.query(`update ${table} set ${sets} ${where} returning ${cols}`, [...values, JSON.stringify(body)]);
        return { rows };
      }
      if (req.method === "DELETE") {
        const { rows } = await db.query(`delete from ${table} ${where} returning ${cols}`, values);
        return { rows };
      }
      throw httpError(405, "PGRST", "method");
    });

    if (result.scalar) return send(res, 200, JSON.stringify(result.rows));
    const headers = {};
    if (result.count != null) headers["Content-Range"] = `${result.rows.length ? `0-${result.rows.length - 1}` : "*"}/${result.count}`;
    if (wantsObject) {
      if (result.rows.length !== 1)
        return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `${result.rows.length} rows`, hint: null });
      return send(res, 200, result.rows[0], headers);
    }
    if (req.method === "HEAD") return send(res, 200, undefined, headers);
    if (req.method !== "GET" && !/return=representation/.test(prefer)) return send(res, result.created ? 201 : 204, undefined, headers);
    return send(res, result.created ? 201 : 200, result.rows, headers);
  } catch (e) {
    send(res, pgStatus(e, claims), { code: e.code ?? "PGRST", message: e.message, details: e.detail ?? null, hint: e.hint ?? null });
  }
}

// ── Auth subset ────────────────────────────────────────
function session(user) {
  const now = Math.floor(Date.now() / 1000);
  const access_token = sign({ sub: user.id, email: user.email, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600 });
  return {
    access_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: sign({ sub: user.id, typ: "refresh", n: crypto.randomUUID() }),
    user: publicUser(user),
  };
}
const publicUser = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() });

async function auth(req, res, url) {
  const route = url.pathname.replace("/auth/v1", "");
  try {
    if (route === "/token" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      if (url.searchParams.get("grant_type") === "password") {
        const { rows } = await pool.query("select id, email, password_hash from auth.users where lower(email) = lower($1)", [body.email ?? ""]);
        const u = rows[0];
        const hash = (p) => crypto.createHash("sha256").update(p).digest("hex");
        if (!u || u.password_hash !== hash(body.password ?? "")) return send(res, 400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials", message: "Invalid login credentials" });
        return send(res, 200, session(u));
      }
      if (url.searchParams.get("grant_type") === "refresh_token") {
        const c = verify(body.refresh_token);
        if (!c?.sub) return send(res, 400, { code: "refresh_token_not_found", msg: "Invalid Refresh Token" });
        const { rows } = await pool.query("select id, email from auth.users where id = $1", [c.sub]);
        if (!rows[0]) return send(res, 400, { code: "user_not_found", msg: "User not found" });
        return send(res, 200, session(rows[0]));
      }
    }
    if (route === "/user" && req.method === "GET") {
      const c = verify(req.headers.authorization?.replace(/^Bearer /i, ""));
      if (!c?.sub) return send(res, 401, { code: "bad_jwt", msg: "invalid JWT" });
      const { rows } = await pool.query("select id, email from auth.users where id = $1", [c.sub]);
      if (!rows[0]) return send(res, 403, { code: "user_not_found", msg: "User not found" });
      return send(res, 200, publicUser(rows[0]));
    }
    if (route === "/logout") return send(res, 204);
    if (route === "/.well-known/jwks.json") return send(res, 200, { keys: [] });
    send(res, 404, { msg: "not implemented in shim", route });
  } catch (e) {
    send(res, 500, { msg: e.message });
  }
}

// ── Storage subset ─────────────────────────────────────
async function storage(req, res, url) {
  const m = url.pathname.match(/^\/storage\/v1\/object\/(public\/)?([^/]+)\/(.+)$/);
  if (!m) return send(res, 404, { message: "not found" });
  const [, isPublic, bucket, objectPath] = m;
  if (bucket !== BUCKET.id || objectPath.includes("..")) return send(res, 400, { statusCode: "400", error: "InvalidKey", message: "bad path" });
  const file = path.join(STORAGE_DIR, bucket, decodeURIComponent(objectPath));

  if (req.method === "GET" && isPublic) {
    if (!fs.existsSync(file)) return send(res, 404, { message: "Object not found" });
    res.writeHead(200, { "Content-Type": fs.readFileSync(file + ".type", "utf8"), "Cache-Control": "public, max-age=31536000" });
    return fs.createReadStream(file).pipe(res);
  }
  if (req.method === "POST" || req.method === "PUT") {
    const claims = claimsFrom(req);
    // Same rule as the storage policies: only admins may write.
    let allowed = false;
    try {
      allowed = await asRole(claims, async (db) => (await db.query("select public.is_admin() as ok")).rows[0].ok);
    } catch {
      allowed = false;
    }
    if (!allowed) return send(res, 403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
    const buf = await readBody(req);
    // supabase-js sends Blob uploads as multipart/form-data or raw; handle both.
    let data = buf;
    let type = req.headers["content-type"] ?? "";
    if (type.startsWith("multipart/form-data")) {
      const boundary = "--" + type.split("boundary=")[1];
      const parts = buf.toString("latin1").split(boundary).filter((p) => p.includes("Content-Disposition"));
      const filePart = parts.find((p) => /name="(?:file|)"/.test(p) || /filename=/.test(p)) ?? parts[parts.length - 1];
      const headerEnd = filePart.indexOf("\r\n\r\n");
      const headers = filePart.slice(0, headerEnd);
      type = headers.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] ?? "application/octet-stream";
      data = Buffer.from(filePart.slice(headerEnd + 4, filePart.length - 2), "latin1");
    }
    if (!BUCKET.types.includes(type)) return send(res, 415, { statusCode: "415", error: "invalid_mime_type", message: `mime type ${type} is not supported` });
    if (data.length > BUCKET.maxBytes) return send(res, 413, { statusCode: "413", error: "Payload too large", message: "The object exceeded the maximum allowed size" });
    if (fs.existsSync(file) && req.headers["x-upsert"] !== "true") return send(res, 409, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    fs.writeFileSync(file + ".type", type);
    return send(res, 200, { Key: `${bucket}/${objectPath}`, Id: crypto.randomUUID() });
  }
  send(res, 405, { message: "method not allowed" });
}

// ── server ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
      "Access-Control-Expose-Headers": "Content-Range",
    });
    return res.end();
  }
  if (url.pathname.startsWith("/rest/v1/")) return rest(req, res, url);
  if (url.pathname.startsWith("/auth/v1/")) return auth(req, res, url);
  if (url.pathname.startsWith("/storage/v1/")) return storage(req, res, url);
  send(res, 404, { message: "not found" });
});

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`supabase shim on http://127.0.0.1:${PORT}`);
    console.log(`ANON_KEY=${ANON_KEY}`);
    console.log(`SERVICE_KEY=${SERVICE_KEY}`);
  });
}
