import crypto from "node:crypto";
import argon2 from "argon2";
import cors from "cors";
import express from "express";
import sql from "mssql";

for (const key of ["DB_PASSWORD", "AUTH_DB_PASSWORD"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const attendancePool = new sql.ConnectionPool({
  server: process.env.DB_SERVER || "10.10.10.60",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "ZKTecoDB",
  user: process.env.DB_USER || "WebDashboardUser",
  password: process.env.DB_PASSWORD,
  options: { encrypt: process.env.DB_ENCRYPT === "true", trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== "false" },
  pool: { min: 2, max: 30, idleTimeoutMillis: 30000 },
});

const authPool = new sql.ConnectionPool({
  server: process.env.AUTH_DB_SERVER || "localhost",
  ...(process.env.AUTH_DB_PORT ? { port: Number(process.env.AUTH_DB_PORT) } : {}),
  database: process.env.AUTH_DB_NAME || "CPSTLPortalDB",
  user: process.env.AUTH_DB_USER || "CPSTLPortalApp",
  password: process.env.AUTH_DB_PASSWORD,
  options: {
    ...(!process.env.AUTH_DB_PORT && process.env.AUTH_DB_INSTANCE ? { instanceName: process.env.AUTH_DB_INSTANCE } : {}),
    encrypt: process.env.AUTH_DB_ENCRYPT === "true",
    trustServerCertificate: process.env.AUTH_DB_TRUST_CERTIFICATE !== "false",
  },
  pool: { min: 2, max: 30, idleTimeoutMillis: 30000 },
});

const attendancePoolPromise = attendancePool.connect();
const authPoolPromise = authPool.connect();
const sessionCookieName = process.env.SESSION_COOKIE_NAME || "cpstl_session";
const sessionHours = Math.max(1, Number(process.env.SESSION_DURATION_HOURS || 8));
const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
const allowedOrigins = process.env.FRONTEND_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true, credentials: true }));
app.use(express.json({ limit: "32kb" }));

function imageDataUrl(value) {
  if (!value) return null;
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const mime = buffer[0] === 0x89 && buffer[1] === 0x50 ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function cookieValue(request, name) {
  for (const item of (request.headers.cookie || "").split(";")) {
    const separator = item.indexOf("=");
    if (separator !== -1 && item.slice(0, separator).trim() === name) return decodeURIComponent(item.slice(separator + 1).trim());
  }
  return null;
}

const tokenHash = (token) => crypto.createHash("sha256").update(token).digest("hex");
const exactSecretMatch = (left, right) => {
  const leftHash = crypto.createHash("sha256").update(String(left)).digest();
  const rightHash = crypto.createHash("sha256").update(String(right)).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
};
const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: sessionHours * 60 * 60 * 1000,
  path: "/",
});

function colomboDateValue() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function validateDateRange(startDate, endDate) {
  const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf());
  if (!valid(startDate) || !valid(endDate)) return "A valid attendance date range is required.";
  if (startDate > endDate) return "The starting date must not be after the end date.";
  const today = colomboDateValue();
  if (endDate > today) return "The attendance end date cannot be in the future.";
  const current = new Date(`${today}T00:00:00Z`);
  const earliest = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 3, 1)).toISOString().slice(0, 10);
  if (startDate < earliest) return "Attendance history is limited to the current and previous 3 months.";
  return null;
}

function validateAdminDateRange(startDate, endDate) {
  const valid = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf());
  if (!valid(startDate) || !valid(endDate)) return "A valid attendance date range is required.";
  if (startDate > endDate) return "The starting date must not be after the end date.";
  if (endDate > colomboDateValue()) return "The attendance end date cannot be in the future.";
  return null;
}

async function createSession(response, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const connection = await authPoolPromise;
  await connection.request()
    .input("userId", sql.Int, userId)
    .input("tokenHash", sql.Char(64), tokenHash(token))
    .input("sessionHours", sql.Int, sessionHours)
    .query("INSERT INTO dbo.WebPortalSessions (UserId, TokenHash, ExpiresAt) VALUES (@userId, @tokenHash, DATEADD(HOUR, @sessionHours, SYSDATETIME()));");
  response.cookie(sessionCookieName, token, sessionCookieOptions());
}

async function authenticate(request, response, next) {
  const token = cookieValue(request, sessionCookieName);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return response.status(401).json({ error: "Authentication required." });
  try {
    const connection = await authPoolPromise;
    const result = await connection.request().input("tokenHash", sql.Char(64), tokenHash(token)).query(`
      SELECT TOP (1) sessions.SessionId, users.UserId, users.EmployeePIN, users.EmployeeEPF,
        users.PasswordHash, users.MustChangePassword, users.IsActive, roles.RoleName
      FROM dbo.WebPortalSessions AS sessions
      INNER JOIN dbo.WebPortalUsers AS users ON users.UserId = sessions.UserId
      INNER JOIN dbo.WebPortalRoles AS roles ON roles.RoleId = users.RoleId
      WHERE sessions.TokenHash = @tokenHash AND sessions.RevokedAt IS NULL
        AND sessions.ExpiresAt > SYSDATETIME() AND users.IsActive = 1;
    `);
    if (!result.recordset[0]) {
      response.clearCookie(sessionCookieName, sessionCookieOptions());
      return response.status(401).json({ error: "Your session has expired. Please sign in again." });
    }
    request.authUser = result.recordset[0];
    next();
  } catch (error) {
    console.error("Session authentication failed", error);
    response.status(500).json({ error: "Unable to verify your session." });
  }
}

function requireAdmin(request, response, next) {
  if (request.authUser?.RoleName !== "Admin") return response.status(403).json({ error: "Administrator access required." });
  next();
}

async function loadEmployeeAttendance(pin, epf, startDate, endDate) {
  const connection = await attendancePoolPromise;
  const employeeResult = await connection.request().input("pin", sql.NVarChar(30), pin).input("epf", sql.NVarChar(30), epf).query(`
    SELECT TOP (1) * FROM dbo.View_EmployeeAttendanceLog_toWebDashBoard
    WHERE CONVERT(NVARCHAR(30), EmployeePIN) = @pin OR (@epf IS NOT NULL AND EmployeeEPF = @epf)
    ORDER BY LogTime DESC;
  `);
  const source = employeeResult.recordset[0];
  if (!source) return null;
  const profileResult = await connection.request().input("pin", sql.NVarChar(30), pin).input("epf", sql.NVarChar(30), epf).query(`
    SELECT TOP (1) ProfileImage FROM dbo.View_EmployeeProfileImage_toWebDashBoard
    WHERE CONVERT(NVARCHAR(30), PIN) = @pin OR (@epf IS NOT NULL AND EmployeeEPF = @epf);
  `);
  const attendanceResult = await connection.request()
    .input("pin", sql.NVarChar(30), pin).input("epf", sql.NVarChar(30), epf)
    .input("startDate", sql.NVarChar(10), startDate).input("endDate", sql.NVarChar(10), endDate).query(`
      WITH DeduplicatedAttendance AS (
        SELECT LogTime, EmployeePIN, EmployeeEPF, VerifyMode, DeviceSerial, DeviceIP, DeviceLocation, DeviceLabel,
          ROW_NUMBER() OVER (PARTITION BY EmployeePIN, LogTime, DeviceSerial ORDER BY LogTime) AS RecordNumber
        FROM dbo.View_EmployeeAttendanceLog_toWebDashBoard
        WHERE (CONVERT(NVARCHAR(30), EmployeePIN) = @pin OR (@epf IS NOT NULL AND EmployeeEPF = @epf))
          AND LogTime >= CONVERT(date, @startDate, 23) AND LogTime < DATEADD(day, 1, CONVERT(date, @endDate, 23))
      )
      SELECT TOP (500) CONCAT(CONVERT(VARCHAR(19), attendance.LogTime, 126), '+05:30') AS LogTime,
        attendance.VerifyMode, attendance.DeviceSerial, attendance.DeviceIP, attendance.DeviceLocation, attendance.DeviceLabel,
        capture.ImageName, capture.CapturedImage
      FROM DeduplicatedAttendance AS attendance
      OUTER APPLY (
        SELECT TOP (1) ImageName, CapturedImage FROM dbo.View_EmployeeAttendanceImagesLog_toWebDashBoard AS imageLog
        WHERE imageLog.EmployeePIN = attendance.EmployeePIN AND imageLog.DeviceSerial = attendance.DeviceSerial
          AND imageLog.LogTime BETWEEN DATEADD(SECOND, -5, attendance.LogTime) AND DATEADD(SECOND, 5, attendance.LogTime)
        ORDER BY ABS(DATEDIFF(MILLISECOND, imageLog.LogTime, attendance.LogTime))
      ) AS capture
      WHERE attendance.RecordNumber = 1 ORDER BY attendance.LogTime DESC;
    `);
  return {
    employee: {
      epf: source.EmployeeEPF ?? epf, pin: source.EmployeePIN ?? pin, name: source.Name,
      mobileNumber: source.MobileNumber ?? null, phoneNumber: source.PhoneNumber ?? null, email: source.Email ?? null,
      location: source.EmployeeLocation ?? source.DeviceLocation ?? null, branch: source.EmployeeBranch ?? null,
      position: source.PositionType ?? null, active: source.ActiveEmployee ?? null,
      deviceName: source.DeviceName ?? null, deviceType: source.DeviceType ?? null,
      profileImage: imageDataUrl(profileResult.recordset[0]?.ProfileImage),
    },
    attendance: attendanceResult.recordset.map((record) => ({
      logTime: record.LogTime, verifyMode: record.VerifyMode, deviceSerial: record.DeviceSerial,
      deviceIP: record.DeviceIP, deviceLocation: record.DeviceLocation, deviceLabel: record.DeviceLabel,
      imageName: record.ImageName ?? null, capturedImage: imageDataUrl(record.CapturedImage),
    })),
  };
}

app.get("/health", async (_request, response) => {
  try {
    const [attendance, auth] = await Promise.all([attendancePoolPromise, authPoolPromise]);
    await Promise.all([attendance.request().query("SELECT 1"), auth.request().query("SELECT 1")]);
    response.json({ status: "ok" });
  } catch { response.status(503).json({ status: "database_unavailable" }); }
});

app.post("/api/auth/login", async (request, response) => {
  const identifier = String(request.body?.identifier || "").trim();
  const password = String(request.body?.password || "");
  if (!/^[A-Za-z0-9-]{1,30}$/.test(identifier) || password.length < 1 || password.length > 200) return response.status(400).json({ error: "Enter a valid Employee EPF/PIN and password." });
  try {
    const connection = await authPoolPromise;
    const loadPortalUser = () => connection.request().input("identifier", sql.NVarChar(30), identifier).query(`
      SELECT TOP (1) users.UserId, users.EmployeePIN, users.EmployeeEPF, users.PasswordHash,
        users.MustChangePassword, users.IsActive, users.FailedLoginCount, users.LockedUntil, roles.RoleName
      FROM dbo.WebPortalUsers AS users INNER JOIN dbo.WebPortalRoles AS roles ON roles.RoleId = users.RoleId
      WHERE users.EmployeePIN = @identifier OR users.EmployeeEPF = @identifier;
    `);
    const invalidMessage = "Invalid Employee EPF/PIN or password.";
    let user = (await loadPortalUser()).recordset[0];

    if (!user) {
      const attendanceConnection = await attendancePoolPromise;
      const employeeResult = await attendanceConnection.request()
        .input("identifier", sql.NVarChar(30), identifier)
        .query(`
          SELECT TOP (2) EmployeePIN, EmployeeEPF
          FROM (
            SELECT DISTINCT
              CONVERT(NVARCHAR(30), PIN) AS EmployeePIN,
              NULLIF(LTRIM(RTRIM(CONVERT(NVARCHAR(30), EmployeeEPF))), N'') AS EmployeeEPF
            FROM dbo.View_EmployeeProfileImage_toWebDashBoard
            WHERE CONVERT(NVARCHAR(30), PIN) = @identifier
              OR LTRIM(RTRIM(CONVERT(NVARCHAR(30), EmployeeEPF))) = @identifier
          ) AS employees;
        `);
      if (employeeResult.recordset.length !== 1) return response.status(401).json({ error: invalidMessage });

      const employee = employeeResult.recordset[0];
      const employeePIN = String(employee.EmployeePIN).trim();
      const employeeEPF = employee.EmployeeEPF == null ? null : String(employee.EmployeeEPF).trim();
      const validTemporaryPassword = exactSecretMatch(password, employeePIN)
        || (employeeEPF !== null && exactSecretMatch(password, employeeEPF));
      if (!validTemporaryPassword) return response.status(401).json({ error: invalidMessage });

      const passwordHash = await argon2.hash(employeePIN, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      try {
        await connection.request()
          .input("employeePIN", sql.NVarChar(30), employeePIN)
          .input("employeeEPF", sql.NVarChar(30), employeeEPF)
          .input("passwordHash", sql.NVarChar(500), passwordHash)
          .query(`
            INSERT INTO dbo.WebPortalUsers
              (EmployeePIN, EmployeeEPF, RoleId, PasswordHash, MustChangePassword, IsActive)
            SELECT @employeePIN, @employeeEPF, RoleId, @passwordHash, 1, 1
            FROM dbo.WebPortalRoles WHERE RoleName = N'Employee';
          `);
      } catch (error) {
        if (error?.number !== 2601 && error?.number !== 2627) throw error;
      }
      user = (await loadPortalUser()).recordset[0];
    }

    if (!user || !user.IsActive || !["Employee", "Admin"].includes(user.RoleName)) return response.status(401).json({ error: invalidMessage });
    if (user.LockedUntil && new Date(user.LockedUntil) > new Date()) return response.status(423).json({ error: "This account is temporarily locked. Try again later." });
    const passwordValid = await argon2.verify(user.PasswordHash, password).catch(() => false)
      || (user.MustChangePassword && (
        exactSecretMatch(password, user.EmployeePIN)
        || (user.EmployeeEPF != null && exactSecretMatch(password, user.EmployeeEPF))
      ));
    if (!passwordValid) {
      await connection.request().input("userId", sql.Int, user.UserId).query(`
        UPDATE dbo.WebPortalUsers SET FailedLoginCount = FailedLoginCount + 1,
          LockedUntil = CASE WHEN FailedLoginCount + 1 >= 5 THEN DATEADD(MINUTE, 15, SYSDATETIME()) ELSE LockedUntil END,
          UpdatedAt = SYSDATETIME() WHERE UserId = @userId;
      `);
      return response.status(401).json({ error: invalidMessage });
    }
    await connection.request().input("userId", sql.Int, user.UserId).query(`
      UPDATE dbo.WebPortalUsers SET FailedLoginCount = 0, LockedUntil = NULL,
        LastLoginAt = SYSDATETIME(), UpdatedAt = SYSDATETIME() WHERE UserId = @userId;
    `);
    await createSession(response, user.UserId);
    response.json({ requiresPasswordChange: Boolean(user.MustChangePassword), role: user.RoleName });
  } catch (error) {
    console.error("Employee login failed", error);
    response.status(500).json({ error: "Unable to sign in at this time." });
  }
});

app.get("/api/auth/session", authenticate, (request, response) => response.json({
  authenticated: true, requiresPasswordChange: Boolean(request.authUser.MustChangePassword),
}));

app.post("/api/auth/change-password", authenticate, async (request, response) => {
  const currentPassword = String(request.body?.currentPassword || "");
  const newPassword = String(request.body?.newPassword || "");
  if (newPassword.length < 4 || newPassword.length > 200) return response.status(400).json({ error: "The new password must contain at least 4 characters." });
  if (newPassword === String(request.authUser.EmployeePIN) || (request.authUser.EmployeeEPF && newPassword === String(request.authUser.EmployeeEPF))) return response.status(400).json({ error: "The new password cannot be your Employee PIN or EPF." });
  const currentValid = await argon2.verify(request.authUser.PasswordHash, currentPassword).catch(() => false);
  if (!currentValid) return response.status(401).json({ error: "The current password is incorrect." });
  try {
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const connection = await authPoolPromise;
    const transaction = new sql.Transaction(connection);
    await transaction.begin();
    try {
      await new sql.Request(transaction).input("userId", sql.Int, request.authUser.UserId).input("passwordHash", sql.NVarChar(500), passwordHash).query(`
        UPDATE dbo.WebPortalUsers SET PasswordHash = @passwordHash, MustChangePassword = 0,
          FailedLoginCount = 0, LockedUntil = NULL, UpdatedAt = SYSDATETIME() WHERE UserId = @userId;
      `);
      await new sql.Request(transaction).input("userId", sql.Int, request.authUser.UserId).input("sessionId", sql.BigInt, request.authUser.SessionId).query(`
        UPDATE dbo.WebPortalSessions SET RevokedAt = SYSDATETIME()
        WHERE UserId = @userId AND SessionId <> @sessionId AND RevokedAt IS NULL;
      `);
      await transaction.commit();
      response.json({ passwordChanged: true, role: request.authUser.RoleName });
    } catch (error) { await transaction.rollback(); throw error; }
  } catch (error) {
    console.error("Password change failed", error);
    response.status(500).json({ error: "Unable to change the password." });
  }
});

app.post("/api/auth/logout", authenticate, async (request, response) => {
  try {
    const connection = await authPoolPromise;
    await connection.request().input("sessionId", sql.BigInt, request.authUser.SessionId).query("UPDATE dbo.WebPortalSessions SET RevokedAt = SYSDATETIME() WHERE SessionId = @sessionId AND RevokedAt IS NULL;");
  } finally {
    response.clearCookie(sessionCookieName, sessionCookieOptions());
    response.json({ signedOut: true });
  }
});

app.get("/api/me/attendance", authenticate, async (request, response) => {
  if (request.authUser.MustChangePassword) return response.status(403).json({ error: "Change your temporary password before viewing attendance." });
  const startDate = String(request.query.startDate || "");
  const endDate = String(request.query.endDate || "");
  const dateError = validateDateRange(startDate, endDate);
  if (dateError) return response.status(400).json({ error: dateError });
  try {
    const data = await loadEmployeeAttendance(String(request.authUser.EmployeePIN), request.authUser.EmployeeEPF == null ? null : String(request.authUser.EmployeeEPF), startDate, endDate);
    if (!data) return response.status(404).json({ error: "No employee attendance profile was found." });
    response.json(data);
  } catch (error) {
    console.error("Employee attendance lookup failed", error);
    response.status(500).json({ error: "Unable to load attendance information." });
  }
});

app.get("/api/admin/unknown-fingerprints", authenticate, requireAdmin, async (request, response) => {
  const startDate = String(request.query.startDate || "");
  const endDate = String(request.query.endDate || "");
  const dateError = validateAdminDateRange(startDate, endDate);
  if (dateError) return response.status(400).json({ error: dateError });
  try {
    const connection = await attendancePoolPromise;
    const result = await connection.request()
      .input("startDate", sql.NVarChar(10), startDate)
      .input("endDate", sql.NVarChar(10), endDate)
      .query(`
      SELECT TOP (200)
        CASE WHEN COALESCE(images.LogTime, parsed.CapturedAt) IS NULL THEN NULL
          ELSE CONCAT(CONVERT(VARCHAR(19), COALESCE(images.LogTime, parsed.CapturedAt), 126), '+05:30')
        END AS LogTime,
        images.DeviceSerial,
        images.ImageName,
        images.CapturedImage
      FROM dbo.View_EmployeeAttendanceImagesLog_toWebDashBoard AS images
      CROSS APPLY (
        SELECT TRY_CONVERT(datetime2(0),
          STUFF(STUFF(STUFF(STUFF(STUFF(LEFT(images.ImageName, 14), 13, 0, ':'), 11, 0, ':'), 9, 0, ' '), 7, 0, '-'), 5, 0, '-')
        ) AS CapturedAt
      ) AS parsed
      WHERE UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(30), images.EmployeePIN)))) = N'UNKNOWN'
        AND images.CapturedImage IS NOT NULL
        AND COALESCE(images.LogTime, parsed.CapturedAt) >= CONVERT(date, @startDate, 23)
        AND COALESCE(images.LogTime, parsed.CapturedAt) < DATEADD(day, 1, CONVERT(date, @endDate, 23))
      ORDER BY COALESCE(images.LogTime, parsed.CapturedAt) DESC, images.ImageName DESC;
      `);
    response.json({
      records: result.recordset.map((record) => ({
        logTime: record.LogTime,
        deviceSerial: record.DeviceSerial,
        imageName: record.ImageName,
        capturedImage: imageDataUrl(record.CapturedImage),
      })),
    });
  } catch (error) {
    console.error("Unknown fingerprint lookup failed", error);
    response.status(500).json({ error: "Unable to load unknown fingerprint images." });
  }
});

app.get("/api/admin/attendance", authenticate, requireAdmin, async (request, response) => {
  const startDate = String(request.query.startDate || "");
  const endDate = String(request.query.endDate || "");
  const search = String(request.query.search || "").trim();
  const page = Math.max(1, Number.parseInt(String(request.query.page || "1"), 10) || 1);
  const pageSize = 100;
  const dateError = validateAdminDateRange(startDate, endDate);
  if (dateError) return response.status(400).json({ error: dateError });
  if (search.length > 50) return response.status(400).json({ error: "The employee search is too long." });
  try {
    const connection = await attendancePoolPromise;
    const result = await connection.request()
      .input("startDate", sql.NVarChar(10), startDate)
      .input("endDate", sql.NVarChar(10), endDate)
      .input("search", sql.NVarChar(50), search)
      .input("offset", sql.Int, (page - 1) * pageSize)
      .input("pageSize", sql.Int, pageSize)
      .query(`
        WITH Attendance AS (
          SELECT LogTime, EmployeePIN, EmployeeEPF, Name, VerifyMode, DeviceSerial, DeviceIP,
            DeviceLocation, DeviceLabel, MobileNumber, PhoneNumber, Email, EmployeeLocation,
            EmployeeBranch, PositionType,
            ROW_NUMBER() OVER (PARTITION BY EmployeePIN, LogTime, DeviceSerial ORDER BY LogTime) AS RecordNumber
          FROM dbo.View_EmployeeAttendanceLog_toWebDashBoard
          WHERE LogTime >= CONVERT(date, @startDate, 23)
            AND LogTime < DATEADD(day, 1, CONVERT(date, @endDate, 23))
            AND EmployeePIN IS NOT NULL
            AND UPPER(LTRIM(RTRIM(CONVERT(NVARCHAR(30), EmployeePIN)))) <> N'UNKNOWN'
            AND (@search = N''
              OR CONVERT(NVARCHAR(30), EmployeePIN) LIKE N'%' + @search + N'%'
              OR CONVERT(NVARCHAR(30), EmployeeEPF) LIKE N'%' + @search + N'%'
              OR Name LIKE N'%' + @search + N'%')
        ), Filtered AS (
          SELECT *, COUNT(*) OVER () AS TotalCount
          FROM Attendance WHERE RecordNumber = 1
        )
        SELECT CONCAT(CONVERT(VARCHAR(19), attendance.LogTime, 126), '+05:30') AS LogTime,
          attendance.EmployeePIN, attendance.EmployeeEPF, attendance.Name, attendance.VerifyMode,
          attendance.DeviceSerial, attendance.DeviceIP, attendance.DeviceLocation, attendance.DeviceLabel,
          attendance.MobileNumber, attendance.PhoneNumber, attendance.Email, attendance.EmployeeLocation,
          attendance.EmployeeBranch, attendance.PositionType, attendance.TotalCount,
          capture.ImageName, capture.CapturedImage
        FROM Filtered AS attendance
        OUTER APPLY (
          SELECT TOP (1) ImageName, CapturedImage
          FROM dbo.View_EmployeeAttendanceImagesLog_toWebDashBoard AS imageLog
          WHERE imageLog.EmployeePIN = attendance.EmployeePIN
            AND imageLog.DeviceSerial = attendance.DeviceSerial
            AND imageLog.LogTime BETWEEN DATEADD(SECOND, -5, attendance.LogTime) AND DATEADD(SECOND, 5, attendance.LogTime)
          ORDER BY ABS(DATEDIFF(MILLISECOND, imageLog.LogTime, attendance.LogTime))
        ) AS capture
        ORDER BY attendance.LogTime DESC
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
      `);
    response.json({
      page,
      pageSize,
      total: result.recordset[0]?.TotalCount || 0,
      records: result.recordset.map((record) => ({
        logTime: record.LogTime,
        employeePIN: record.EmployeePIN,
        employeeEPF: record.EmployeeEPF,
        name: record.Name,
        verifyMode: record.VerifyMode,
        deviceSerial: record.DeviceSerial,
        deviceIP: record.DeviceIP,
        deviceLocation: record.DeviceLocation,
        deviceLabel: record.DeviceLabel,
        mobileNumber: record.MobileNumber ?? record.PhoneNumber,
        email: record.Email,
        employeeLocation: record.EmployeeLocation,
        employeeBranch: record.EmployeeBranch,
        position: record.PositionType,
        imageName: record.ImageName,
        capturedImage: imageDataUrl(record.CapturedImage),
      })),
    });
  } catch (error) {
    console.error("Admin attendance lookup failed", error);
    response.status(500).json({ error: "Unable to load employee attendance records." });
  }
});

const port = Number(process.env.API_PORT || 4000);
try {
  await Promise.all([attendancePoolPromise, authPoolPromise]);
  app.listen(port, "0.0.0.0", () => console.log(`CPSTL attendance API listening on port ${port}`));
} catch (error) {
  console.error("CPSTL attendance API could not connect to its databases:", error.message);
  process.exit(1);
}
