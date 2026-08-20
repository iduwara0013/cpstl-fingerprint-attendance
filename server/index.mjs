import cors from "cors";
import express from "express";
import sql from "mssql";

const required = ["DB_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const pool = new sql.ConnectionPool({
  server: process.env.DB_SERVER || "10.10.10.60",
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || "ZKTecoDB",
  user: process.env.DB_USER || "WebDashboardUser",
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_CERTIFICATE !== "false",
  },
  pool: { min: 2, max: 30, idleTimeoutMillis: 30000 },
});

const poolPromise = pool.connect();
const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "32kb" }));

function imageDataUrl(value) {
  if (!value) return null;
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const mime = buffer[0] === 0x89 && buffer[1] === 0x50 ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

app.get("/health", async (_request, response) => {
  try {
    const connection = await poolPromise;
    await connection.request().query("SELECT 1 AS healthy");
    response.json({ status: "ok" });
  } catch {
    response.status(503).json({ status: "database_unavailable" });
  }
});

app.get("/api/employees/:identifier", async (request, response) => {
  const identifier = String(request.params.identifier || "").trim();
  if (!/^[A-Za-z0-9-]{1,30}$/.test(identifier)) {
    return response.status(400).json({ error: "Invalid EPF or Employee PIN." });
  }

  try {
    const connection = await poolPromise;
    const employeeResult = await connection.request().input("identifier", sql.NVarChar(30), identifier).query(`
      SELECT TOP (1) *
      FROM dbo.View_EmployeeAttendanceLog_toWebDashBoard
      WHERE EmployeeEPF = @identifier
         OR CONVERT(NVARCHAR(30), EmployeePIN) = @identifier
      ORDER BY LogTime DESC;
    `);

    if (!employeeResult.recordset[0]) {
      return response.status(404).json({ error: "Employee EPF or PIN was not found." });
    }

    const source = employeeResult.recordset[0];
    const canonicalEPF = String(source.EmployeeEPF);

    const profileResult = await connection.request().input("epf", sql.NVarChar(30), canonicalEPF).query(`
      SELECT TOP (1) PIN, EmployeeEPF, ProfileImage
      FROM dbo.View_EmployeeProfileImage_toWebDashBoard
      WHERE EmployeeEPF = @epf;
    `);

    const attendanceResult = await connection.request().input("epf", sql.NVarChar(30), canonicalEPF).query(`
      WITH DeduplicatedAttendance AS (
        SELECT
          LogTime, EmployeePIN, EmployeeEPF, Name, VerifyMode,
          DeviceSerial, DeviceIP, DeviceLocation, DeviceLabel, DeviceId,
          ROW_NUMBER() OVER (
            PARTITION BY EmployeePIN, LogTime, DeviceSerial
            ORDER BY LogTime
          ) AS RecordNumber
        FROM dbo.View_EmployeeAttendanceLog_toWebDashBoard
        WHERE EmployeeEPF = @epf
      )
      SELECT TOP (100)
        attendance.LogTime, attendance.EmployeePIN, attendance.EmployeeEPF,
        attendance.Name, attendance.VerifyMode, attendance.DeviceSerial,
        attendance.DeviceIP, attendance.DeviceLocation, attendance.DeviceLabel,
        attendance.DeviceId, capture.ImageName, capture.CapturedImage
      FROM DeduplicatedAttendance AS attendance
      OUTER APPLY (
        SELECT TOP (1) ImageName, CapturedImage
        FROM dbo.View_EmployeeAttendanceImagesLog_toWebDashBoard AS imageLog
        WHERE imageLog.EmployeePIN = attendance.EmployeePIN
          AND imageLog.DeviceSerial = attendance.DeviceSerial
          AND imageLog.LogTime BETWEEN DATEADD(SECOND, -5, attendance.LogTime)
                                   AND DATEADD(SECOND, 5, attendance.LogTime)
        ORDER BY ABS(DATEDIFF(MILLISECOND, imageLog.LogTime, attendance.LogTime))
      ) AS capture
      WHERE attendance.RecordNumber = 1
      ORDER BY attendance.LogTime DESC;
    `);

    const profile = profileResult.recordset[0];
    response.json({
      employee: {
        epf: source.EmployeeEPF,
        pin: source.EmployeePIN,
        name: source.Name,
        mobileNumber: source.MobileNumber ?? null,
        phoneNumber: source.PhoneNumber ?? null,
        email: source.Email ?? null,
        location: source.EmployeeLocation ?? source.DeviceLocation ?? null,
        branch: source.EmployeeBranch ?? null,
        position: source.PositionType ?? null,
        active: source.ActiveEmployee ?? null,
        deviceName: source.DeviceName ?? null,
        deviceType: source.DeviceType ?? null,
        profileImage: imageDataUrl(profile?.ProfileImage),
      },
      attendance: attendanceResult.recordset.map((record) => ({
        logTime: record.LogTime,
        verifyMode: record.VerifyMode,
        deviceSerial: record.DeviceSerial,
        deviceIP: record.DeviceIP,
        deviceLocation: record.DeviceLocation,
        deviceLabel: record.DeviceLabel,
        imageName: record.ImageName ?? null,
        capturedImage: imageDataUrl(record.CapturedImage),
      })),
    });
  } catch (error) {
    console.error("Employee attendance lookup failed", error);
    response.status(500).json({ error: "Unable to load attendance information." });
  }
});

const port = Number(process.env.API_PORT || 4000);
app.listen(port, "0.0.0.0", () => console.log(`CPSTL attendance API listening on port ${port}`));
