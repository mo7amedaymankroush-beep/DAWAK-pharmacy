import "dotenv/config";
import express from "express";
import mysql from "mysql2/promise";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { drugs } from "../src/data/drugs.js";

const app = express();
const port = Number(process.env.API_PORT || 3001);
const deliveryFee = Number(process.env.DELIVERY_FEE ?? 30);
const discountPercent = Number(process.env.DISCOUNT_PERCENT ?? 0);
const productCatalog = new Map(drugs.map((drug) => [Number(drug.id), drug]));
const otpChallenges = new Map();
const smsSendLimits = new Map();
const smsIpLimits = new Map();
const passwordLoginLimits = new Map();
const oauthStates = new Map();
const otpLifetimeMs = 5 * 60 * 1000;
const otpResendDelayMs = 60 * 1000;
const accessTokenLifetimeSeconds = 30 * 24 * 60 * 60;
const oauthStateLifetimeMs = 10 * 60 * 1000;

app.use(express.json({ limit: "32kb" }));

let pool;
let databaseReady = false;

function getPool() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    throw new Error("إعدادات MySQL غير مكتملة. انسخ .env.example إلى .env واضبط بيانات قاعدة البيانات.");
  }
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
      charset: "utf8mb4",
    });
  }
  return pool;
}

async function ensureSchema() {
  if (databaseReady) return;
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(120) NOT NULL,
      customer_phone VARCHAR(30) NOT NULL,
      delivery_address VARCHAR(500) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      delivery_fee DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      status ENUM('pending','confirmed','preparing','delivered','cancelled') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX orders_created_at_idx (created_at),
      INDEX orders_status_idx (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(180) NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      line_total DECIMAL(10,2) NOT NULL,
      CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      INDEX order_items_order_idx (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS customer_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(120) NOT NULL,
      phone VARCHAR(16) NULL,
      email VARCHAR(254) NULL,
      password_hash VARCHAR(255) NULL,
      auth_provider VARCHAR(16) NOT NULL DEFAULT 'local',
      provider_user_id VARCHAR(128) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY customer_accounts_phone_uq (phone),
      UNIQUE KEY customer_accounts_email_uq (email),
      UNIQUE KEY customer_accounts_provider_user_uq (auth_provider, provider_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  const [accountColumns] = await db.execute(
    `SELECT COLUMN_NAME, IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_accounts'`,
  );
  const columnNames = new Set(accountColumns.map((column) => column.COLUMN_NAME));
  if (!columnNames.has("email")) await db.query("ALTER TABLE customer_accounts ADD COLUMN email VARCHAR(254) NULL");
  if (!columnNames.has("password_hash")) await db.query("ALTER TABLE customer_accounts ADD COLUMN password_hash VARCHAR(255) NULL");
  if (!columnNames.has("auth_provider")) await db.query("ALTER TABLE customer_accounts ADD COLUMN auth_provider VARCHAR(16) NOT NULL DEFAULT 'local'");
  if (!columnNames.has("provider_user_id")) await db.query("ALTER TABLE customer_accounts ADD COLUMN provider_user_id VARCHAR(128) NULL");
  const phoneColumn = accountColumns.find((column) => column.COLUMN_NAME === "phone");
  if (phoneColumn && phoneColumn.IS_NULLABLE === "NO") {
    await db.query("ALTER TABLE customer_accounts MODIFY COLUMN phone VARCHAR(16) NULL");
  }
  const [accountIndexes] = await db.execute(
    `SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_accounts'`,
  );
  const indexNames = new Set(accountIndexes.map((index) => index.INDEX_NAME));
  if (!indexNames.has("customer_accounts_email_uq")) {
    await db.query("ALTER TABLE customer_accounts ADD UNIQUE KEY customer_accounts_email_uq (email)");
  }
  if (!indexNames.has("customer_accounts_provider_user_uq")) {
    await db.query("ALTER TABLE customer_accounts ADD UNIQUE KEY customer_accounts_provider_user_uq (auth_provider, provider_user_id)");
  }
  databaseReady = true;
}

function normalizeEgyptianPhone(value) {
  const westernDigits = String(value || "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  const digits = westernDigits.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("0020")
    ? digits.slice(4)
    : digits.startsWith("20")
      ? digits.slice(2)
      : digits;
  const national = withoutCountryCode.startsWith("0")
    ? withoutCountryCode
    : `0${withoutCountryCode}`;

  return /^01[0125]\d{8}$/.test(national) ? `+20${national.slice(1)}` : null;
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash || typeof password !== "string") return false;
  const [saltHex, hashHex] = passwordHash.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function hashOtp(phone, code) {
  return createHmac("sha256", process.env.AUTH_TOKEN_SECRET)
    .update(`${phone}:${code}`)
    .digest("hex");
}

function createAccessToken(account) {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("يجب ضبط AUTH_TOKEN_SECRET بطول 32 حرفًا على الأقل.");
  }
  const payload = Buffer.from(JSON.stringify({
    sub: String(account.id),
    phone: account.phone,
    exp: Math.floor(Date.now() / 1000) + accessTokenLifetimeSeconds,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyAccessToken(token) {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || !token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Math.floor(Date.now() / 1000) ? data : null;
  } catch {
    return null;
  }
}

function requireAccount(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const account = verifyAccessToken(token);
  if (!account) return res.status(401).json({ error: "انتهت جلسة الدخول. سجل الدخول مرة أخرى." });
  req.account = account;
  next();
}

function takeSmsRateLimit(req, phone) {
  const now = Date.now();
  const lastSentAt = smsSendLimits.get(phone) || 0;
  if (now - lastSentAt < otpResendDelayMs) {
    return Math.ceil((otpResendDelayMs - (now - lastSentAt)) / 1000);
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const current = smsIpLimits.get(ip);
  const window = !current || now - current.startedAt >= 60 * 60 * 1000
    ? { startedAt: now, count: 0 }
    : current;
  if (window.count >= 10) return -1;

  window.count++;
  smsIpLimits.set(ip, window);
  smsSendLimits.set(phone, now);
  return 0;
}

function takePasswordLoginRateLimit(req) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const current = passwordLoginLimits.get(ip);
  const window = !current || now - current.startedAt >= 15 * 60 * 1000
    ? { startedAt: now, count: 0 }
    : current;
  if (window.count >= 20) return false;
  window.count++;
  passwordLoginLimits.set(ip, window);
  return true;
}

async function sendSms(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || (!messagingServiceSid && !from)) {
    throw new Error("إعدادات خدمة الرسائل غير مكتملة. اضبط بيانات Twilio في ملف .env.");
  }

  const body = new URLSearchParams({ To: to, Body: message });
  if (messagingServiceSid) body.set("MessagingServiceSid", messagingServiceSid);
  else body.set("From", from);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      console.error("SMS provider rejected OTP request:", details.message || response.status);
      throw new Error("تعذر إرسال رسالة التحقق. راجع إعدادات مزود الرسائل وحاول مرة أخرى.");
    }
  } finally {
    clearTimeout(timeout);
  }
}

function oauthConfig(provider) {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    };
  }
  return {
    clientId: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL,
  };
}

function oauthReady(provider) {
  const config = oauthConfig(provider);
  return Boolean(
    process.env.AUTH_TOKEN_SECRET?.length >= 32 &&
    config.clientId && config.clientSecret && config.callbackUrl && process.env.APP_ORIGIN,
  );
}

function requestCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "").split(";").map((part) => {
      const separator = part.indexOf("=");
      return separator < 0
        ? ["", ""]
        : [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
    }).filter(([name]) => name),
  );
}

function sendOAuthPopupResult(res, payload) {
  const origin = process.env.APP_ORIGIN || "http://localhost:5173";
  const encodedPayload = JSON.stringify(payload).replace(/</g, "\\u003c");
  const encodedOrigin = JSON.stringify(origin);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'");
  res.type("html").send(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تسجيل الدخول إلى دواك</title><body><p>تمت معالجة تسجيل الدخول. يمكنك إغلاق هذه النافذة.</p><script>if(window.opener){window.opener.postMessage({type:"dawak-oauth",payload:${encodedPayload}},${encodedOrigin});}window.close();</script></body></html>`);
}

async function exchangeOAuthProfile(provider, code) {
  const config = oauthConfig(provider);
  if (provider === "google") {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.callbackUrl,
        grant_type: "authorization_code",
      }),
    });
    const tokenPayload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error("تعذر التحقق من حساب Google.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    const profile = await profileResponse.json().catch(() => ({}));
    if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) {
      throw new Error("تعذر التأكد من البريد الإلكتروني في حساب Google.");
    }
    return { id: profile.sub, name: profile.name, email: normalizeEmail(profile.email) };
  }

  const graphVersion = process.env.FACEBOOK_GRAPH_VERSION || "v22.0";
  const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
  tokenUrl.search = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.callbackUrl,
  }).toString();
  const tokenResponse = await fetch(tokenUrl);
  const tokenPayload = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error("تعذر التحقق من حساب Facebook.");
  const profileUrl = new URL(`https://graph.facebook.com/${graphVersion}/me`);
  profileUrl.search = new URLSearchParams({
    fields: "id,name,email",
    access_token: tokenPayload.access_token,
  }).toString();
  const profileResponse = await fetch(profileUrl);
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || !profile.id || !profile.name) throw new Error("تعذر تحميل بيانات حساب Facebook.");
  return { id: profile.id, name: profile.name, email: normalizeEmail(profile.email) };
}

async function getOrCreateOAuthAccount(provider, profile) {
  const db = getPool();
  const [accounts] = await db.execute(
    `SELECT id, customer_name AS name, phone, email FROM customer_accounts
     WHERE auth_provider = ? AND provider_user_id = ? LIMIT 1`,
    [provider, profile.id],
  );
  if (accounts.length) return accounts[0];

  if (profile.email) {
    const [emailAccounts] = await db.execute(
      "SELECT id FROM customer_accounts WHERE email = ? LIMIT 1",
      [profile.email],
    );
    if (emailAccounts.length) {
      throw new Error("هذا البريد مرتبط بحساب موجود. سجل الدخول بالبريد وكلمة المرور أولًا.");
    }
  }

  const [result] = await db.execute(
    `INSERT INTO customer_accounts (customer_name, email, auth_provider, provider_user_id)
     VALUES (?, ?, ?, ?)`,
    [String(profile.name || "مستخدم دواك").trim().slice(0, 120), profile.email, provider, profile.id],
  );
  return {
    id: result.insertId,
    name: String(profile.name || "مستخدم دواك").trim().slice(0, 120),
    phone: null,
    email: profile.email,
  };
}

for (const provider of ["google", "facebook"]) {
  app.get(`/api/auth/${provider}/start`, (req, res) => {
    if (!oauthReady(provider)) {
      return res.status(503).send("تسجيل الدخول السريع غير مُعدّ على الخادم.");
    }
    const config = oauthConfig(provider);
    const state = randomBytes(32).toString("base64url");
    const cookieName = `dawak_oauth_${provider}`;
    oauthStates.set(state, { provider, expiresAt: Date.now() + oauthStateLifetimeMs });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(state)}; HttpOnly; SameSite=Lax; Path=/api/auth/${provider}; Max-Age=600${secure}`);

    const authorizationUrl = provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL(`https://www.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || "v22.0"}/dialog/oauth`);
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      response_type: "code",
      state,
      ...(provider === "google"
        ? { scope: "openid email profile", prompt: "select_account" }
        : { scope: "email,public_profile" }),
    }).toString();
    res.redirect(authorizationUrl.toString());
  });

  app.get(`/api/auth/${provider}/callback`, async (req, res) => {
    const cookieName = `dawak_oauth_${provider}`;
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${cookieName}=; HttpOnly; SameSite=Lax; Path=/api/auth/${provider}; Max-Age=0${secure}`);
    const state = String(req.query.state || "");
    const cookieState = requestCookies(req)[cookieName];
    const stateData = oauthStates.get(state);
    oauthStates.delete(state);
    if (!state || state !== cookieState || !stateData || stateData.provider !== provider || stateData.expiresAt < Date.now()) {
      return sendOAuthPopupResult(res, { error: "انتهت محاولة الدخول أو لم تكن صالحة. حاول مرة أخرى." });
    }
    if (req.query.error || typeof req.query.code !== "string") {
      return sendOAuthPopupResult(res, { error: "تم إلغاء تسجيل الدخول." });
    }

    try {
      await ensureSchema();
      const profile = await exchangeOAuthProfile(provider, req.query.code);
      const account = await getOrCreateOAuthAccount(provider, profile);
      const accessToken = createAccessToken(account);
      sendOAuthPopupResult(res, {
        user: account,
        accessToken,
        expiresIn: accessTokenLifetimeSeconds,
        message: `تم تسجيل الدخول باستخدام ${provider === "google" ? "Google" : "Facebook"}.`,
      });
    } catch (error) {
      console.error(`${provider} sign-in failed:`, error.message);
      sendOAuthPopupResult(res, { error: error.message || "تعذر تسجيل الدخول السريع." });
    }
  });
}

function requireAdmin(req, res, next) {
  const configuredToken = process.env.PHARMACY_ADMIN_TOKEN;
  const receivedToken = req.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configuredToken) {
    return res.status(503).json({ error: "لم يتم ضبط رمز لوحة الصيدلية على الخادم." });
  }
  const expected = Buffer.from(configuredToken);
  const received = Buffer.from(receivedToken);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return res.status(401).json({ error: "رمز الدخول غير صحيح." });
  }
  next();
}

app.get("/api/health", async (_req, res) => {
  try {
    await ensureSchema();
    await getPool().query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "unavailable", error: error.message });
  }
});

app.get("/api/checkout-config", (_req, res) => {
  res.json({
    deliveryFee: Math.max(0, deliveryFee),
    discountPercent: Math.min(Math.max(discountPercent, 0), 100),
  });
});

app.get("/api/auth/providers", (_req, res) => {
  res.json({
    google: oauthReady("google"),
    facebook: oauthReady("facebook"),
  });
});

app.post("/api/auth/request-otp", async (req, res) => {
  const phone = normalizeEgyptianPhone(req.body?.phone);
  if (!phone) {
    return res.status(400).json({ error: "أدخل رقم هاتف مصري صحيحًا." });
  }
  if (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.length < 32) {
    return res.status(503).json({ error: "الخادم غير مجهز للجلسات. اضبط AUTH_TOKEN_SECRET في ملف .env." });
  }

  let waitSeconds;
  try {
    await ensureSchema();
    const [existingAccounts] = await getPool().execute(
      "SELECT id FROM customer_accounts WHERE phone = ? LIMIT 1",
      [phone],
    );
    if (!existingAccounts.length) {
      return res.status(404).json({ error: "لا يوجد حساب بهذا الرقم. أنشئ حسابًا جديدًا أولًا." });
    }

    waitSeconds = takeSmsRateLimit(req, phone);
    if (waitSeconds === -1) {
      return res.status(429).json({ error: "تم تجاوز عدد رسائل التحقق المسموح. حاول بعد ساعة." });
    }
    if (waitSeconds > 0) {
      return res.status(429).json({ error: `انتظر ${waitSeconds} ثانية قبل طلب رمز جديد.` });
    }

    const code = String(randomInt(100000, 1000000));
    await sendSms(phone, `رمز التحقق الخاص بدواك هو: ${code}. صالح لمدة 5 دقائق.`);
    otpChallenges.set(phone, {
      hash: hashOtp(phone, code),
      expiresAt: Date.now() + otpLifetimeMs,
      attempts: 0,
    });
    smsSendLimits.set(phone, Date.now());
    res.json({ message: "تم إرسال رمز التحقق إلى هاتفك." });
  } catch (error) {
    if (waitSeconds === 0) smsSendLimits.delete(phone);
    console.error("OTP request failed:", error.message);
    res.status(503).json({ error: error.message || "تعذر إرسال رمز التحقق حاليًا." });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const phone = normalizeEgyptianPhone(req.body?.phone);
  const code = String(req.body?.code || "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .trim();
  if (!phone || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "أدخل رقم الهاتف ورمز التحقق المكوّن من 6 أرقام." });
  }

  const challenge = otpChallenges.get(phone);
  if (!challenge || challenge.expiresAt < Date.now()) {
    otpChallenges.delete(phone);
    return res.status(400).json({ error: "رمز التحقق غير صالح أو انتهت صلاحيته. اطلب رمزًا جديدًا." });
  }

  challenge.attempts++;
  if (!safeEqual(hashOtp(phone, code), challenge.hash)) {
    if (challenge.attempts >= 5) otpChallenges.delete(phone);
    return res.status(400).json({
      error: challenge.attempts >= 5
        ? "تم تجاوز عدد المحاولات. اطلب رمز تحقق جديدًا."
        : "رمز التحقق غير صحيح.",
    });
  }

  otpChallenges.delete(phone);
  try {
    await ensureSchema();
    const [rows] = await getPool().execute(
      "SELECT id, customer_name AS name, phone FROM customer_accounts WHERE phone = ? LIMIT 1",
      [phone],
    );
    if (!rows.length) return res.status(404).json({ error: "الحساب غير موجود. أنشئ حسابًا جديدًا." });
    const account = rows[0];

    const accessToken = createAccessToken(account);
    res.json({
      user: { id: account.id, name: account.name, phone: account.phone },
      accessToken,
      expiresIn: accessTokenLifetimeSeconds,
    });
  } catch (error) {
    console.error("OTP verification failed:", error.message);
    res.status(503).json({ error: error.message || "تعذر إكمال تسجيل الدخول." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const phone = normalizeEgyptianPhone(req.body?.phone);
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (name.length < 2 || name.length > 120) {
    return res.status(400).json({ error: "أدخل اسمًا من حرفين إلى 120 حرفًا." });
  }
  if ((!phone && !email) || (req.body?.phone && !phone) || (req.body?.email && !email)) {
    return res.status(400).json({ error: "أدخل بريدًا إلكترونيًا صحيحًا أو رقم هاتف مصريًا صحيحًا." });
  }
  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "كلمة المرور يجب أن تكون من 8 إلى 128 حرفًا." });
  }
  if (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.length < 32) {
    return res.status(503).json({ error: "الخادم غير مجهز للجلسات. اضبط AUTH_TOKEN_SECRET في ملف .env." });
  }

  let connection;
  try {
    await ensureSchema();
    connection = await getPool().getConnection();
    await connection.beginTransaction();
    const [existingAccounts] = await connection.execute(
      email
        ? "SELECT id FROM customer_accounts WHERE email = ? LIMIT 1 FOR UPDATE"
        : "SELECT id FROM customer_accounts WHERE phone = ? LIMIT 1 FOR UPDATE",
      [email || phone],
    );
    if (existingAccounts.length) {
      await connection.rollback();
      return res.status(409).json({ error: "هذا البريد أو الرقم مسجل بالفعل. سجل الدخول إلى حسابك." });
    }

    const [result] = await connection.execute(
      `INSERT INTO customer_accounts (customer_name, phone, email, password_hash)
       VALUES (?, ?, ?, ?)`,
      [name, phone, email, hashPassword(password)],
    );
    await connection.commit();
    const account = { id: result.insertId, name, phone, email };
    const accessToken = createAccessToken(account);

    let welcomeSmsSent = false;
    let welcomeMessage = "تم إنشاء حسابك بنجاح.";
    if (phone) {
      const rateLimit = takeSmsRateLimit(req, phone);
      if (rateLimit === 0) {
        try {
          await sendSms(
            phone,
            `أهلًا ${name}، نورت دواك! أنت في المكان الصح. نتمنى لك الشفاء العاجل ودوام الصحة والعافية.`,
          );
          welcomeSmsSent = true;
          welcomeMessage = "تم إنشاء حسابك وإرسال رسالة ترحيب إلى هاتفك.";
        } catch (smsError) {
          smsSendLimits.delete(phone);
          console.error("Welcome SMS failed:", smsError.message);
          welcomeMessage = "تم إنشاء حسابك، لكن تعذر إرسال الرسالة الترحيبية الآن.";
        }
      } else {
        welcomeMessage = "تم إنشاء حسابك، لكن تعذر إرسال رسالة ترحيب أخرى إلى هذا الرقم الآن.";
      }
    }

    res.status(201).json({
      user: account,
      accessToken,
      expiresIn: accessTokenLifetimeSeconds,
      welcomeSmsSent,
      message: welcomeMessage,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "هذا الرقم مسجل بالفعل. سجل الدخول إلى حسابك." });
    }
    console.error("Account registration failed:", error.message);
    res.status(503).json({ error: error.message || "تعذر إنشاء الحساب حاليًا." });
  } finally {
    connection?.release();
  }
});

app.post("/api/auth/login", async (req, res) => {
  const identifier = String(req.body?.identifier || "").trim();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const isEmail = identifier.includes("@");
  const email = isEmail ? normalizeEmail(identifier) : null;
  const phone = isEmail ? null : normalizeEgyptianPhone(identifier);
  if ((!email && !phone) || !password || password.length > 128) {
    return res.status(400).json({ error: "أدخل بريدًا أو رقم هاتف صحيحًا وكلمة المرور." });
  }
  if (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.length < 32) {
    return res.status(503).json({ error: "الخادم غير مجهز للجلسات. اضبط AUTH_TOKEN_SECRET في ملف .env." });
  }
  if (!takePasswordLoginRateLimit(req)) {
    return res.status(429).json({ error: "محاولات كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى." });
  }

  try {
    await ensureSchema();
    const [rows] = await getPool().execute(
      email
        ? "SELECT id, customer_name AS name, phone, email, password_hash FROM customer_accounts WHERE email = ? LIMIT 1"
        : "SELECT id, customer_name AS name, phone, email, password_hash FROM customer_accounts WHERE phone = ? LIMIT 1",
      [email || phone],
    );
    const account = rows[0];
    if (!account || !verifyPassword(password, account.password_hash)) {
      return res.status(401).json({ error: "البريد أو الرقم أو كلمة المرور غير صحيحة." });
    }
    const accessToken = createAccessToken(account);
    res.json({
      user: { id: account.id, name: account.name, phone: account.phone, email: account.email },
      accessToken,
      expiresIn: accessTokenLifetimeSeconds,
    });
  } catch (error) {
    console.error("Account login failed:", error.message);
    res.status(503).json({ error: "تعذر تسجيل الدخول حاليًا." });
  }
});

app.get("/api/auth/me", requireAccount, async (req, res) => {
  try {
    await ensureSchema();
    const [rows] = await getPool().execute(
      "SELECT id, customer_name AS name, phone, email FROM customer_accounts WHERE id = ? LIMIT 1",
      [req.account.sub],
    );
    if (!rows.length) return res.status(401).json({ error: "الحساب غير موجود." });
    res.json({ user: rows[0] });
  } catch (error) {
    console.error("Account lookup failed:", error.message);
    res.status(503).json({ error: "تعذر التحقق من الحساب حاليًا." });
  }
});

app.post("/api/orders", async (req, res) => {
  const customer = req.body?.customer;
  const requestedItems = req.body?.items;

  if (
    !customer ||
    typeof customer.name !== "string" || customer.name.trim().length < 2 || customer.name.length > 120 ||
    typeof customer.phone !== "string" || !/^[+\d\s()-]{7,30}$/.test(customer.phone.trim()) ||
    typeof customer.address !== "string" || customer.address.trim().length < 5 || customer.address.length > 500
  ) {
    return res.status(400).json({ error: "أدخل الاسم ورقم هاتف صحيحًا وعنوان توصيل كاملًا." });
  }

  if (!Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.length > 50) {
    return res.status(400).json({ error: "العربة فارغة أو تحتوي على عدد منتجات غير صالح." });
  }

  const quantities = new Map();
  for (const item of requestedItems) {
    const productId = Number(item?.productId);
    const quantity = Number(item?.quantity);
    if (!productCatalog.has(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: "توجد بيانات منتج أو كمية غير صالحة." });
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    if (quantities.get(productId) > 99) {
      return res.status(400).json({ error: "الحد الأقصى لكل منتج هو 99 قطعة." });
    }
  }

  const items = [...quantities].map(([productId, quantity]) => {
    const product = productCatalog.get(productId);
    const unitPrice = Number(product.price);
    return {
      productId,
      name: product.name,
      quantity,
      unitPrice,
      lineTotal: Number((unitPrice * quantity).toFixed(2)),
    };
  });
  const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const fee = subtotal > 0 ? Math.max(0, deliveryFee) : 0;
  const discount = Number((subtotal * Math.min(Math.max(discountPercent, 0), 100) / 100).toFixed(2));
  const total = Number((subtotal + fee - discount).toFixed(2));

  let connection;
  try {
    await ensureSchema();
    connection = await getPool().getConnection();
    await connection.beginTransaction();
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (customer_name, customer_phone, delivery_address, subtotal, delivery_fee, discount, total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customer.name.trim(), customer.phone.trim(), customer.address.trim(), subtotal, fee, discount, total],
    );
    const orderId = orderResult.insertId;
    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.name, item.quantity, item.unitPrice, item.lineTotal],
      );
    }
    await connection.commit();
    res.status(201).json({
      order: {
        id: orderId,
        items,
        subtotal,
        deliveryFee: fee,
        discount,
        total,
        status: "pending",
      },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Order creation failed:", error.message);
    res.status(503).json({ error: "تعذر حفظ الطلب حاليًا. تحقق من اتصال قاعدة البيانات وحاول مرة أخرى." });
  } finally {
    connection?.release();
  }
});

app.get("/api/orders", requireAdmin, async (_req, res) => {
  try {
    await ensureSchema();
    const [rows] = await getPool().query(`
      SELECT o.id, o.customer_name, o.customer_phone, o.delivery_address,
             o.subtotal, o.delivery_fee, o.discount, o.total, o.status, o.created_at,
             i.product_id, i.product_name, i.quantity, i.unit_price, i.line_total
      FROM orders o
      LEFT JOIN order_items i ON i.order_id = o.id
      ORDER BY o.created_at DESC, o.id DESC
    `);
    const orderMap = new Map();
    for (const row of rows) {
      if (!orderMap.has(row.id)) {
        orderMap.set(row.id, {
          id: row.id,
          customer: { name: row.customer_name, phone: row.customer_phone, address: row.delivery_address },
          subtotal: row.subtotal,
          deliveryFee: row.delivery_fee,
          discount: row.discount,
          total: row.total,
          status: row.status,
          createdAt: row.created_at,
          items: [],
        });
      }
      if (row.product_id !== null) {
        orderMap.get(row.id).items.push({
          productId: row.product_id,
          name: row.product_name,
          quantity: row.quantity,
          unitPrice: row.unit_price,
          lineTotal: row.line_total,
        });
      }
    }
    res.json({ orders: [...orderMap.values()] });
  } catch (error) {
    console.error("Order list failed:", error.message);
    res.status(503).json({ error: "تعذر تحميل الطلبات. تحقق من اتصال قاعدة البيانات." });
  }
});

app.patch("/api/orders/:id/status", requireAdmin, async (req, res) => {
  const allowedStatuses = ["pending", "confirmed", "preparing", "delivered", "cancelled"];
  if (!allowedStatuses.includes(req.body?.status)) {
    return res.status(400).json({ error: "حالة الطلب غير صالحة." });
  }
  try {
    await ensureSchema();
    const [result] = await getPool().execute(
      "UPDATE orders SET status = ? WHERE id = ?",
      [req.body.status, Number(req.params.id)],
    );
    if (!result.affectedRows) return res.status(404).json({ error: "الطلب غير موجود." });
    res.json({ id: Number(req.params.id), status: req.body.status });
  } catch (error) {
    console.error("Order status update failed:", error.message);
    res.status(503).json({ error: "تعذر تحديث حالة الطلب." });
  }
});

app.listen(port, () => {
  console.log(`DAWAK orders API listening on http://localhost:${port}`);
});
