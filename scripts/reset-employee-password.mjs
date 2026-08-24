import argon2 from "argon2";
import sql from "mssql";

const identifier = String(process.argv[2] || "").trim();
if (!/^[A-Za-z0-9-]{1,30}$/.test(identifier)) {
  console.error("Usage: node --env-file=.env scripts/reset-employee-password.mjs <EmployeePIN-or-EPF>");
  process.exit(1);
}

for (const key of ["AUTH_DB_PASSWORD"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const pool = await sql.connect({
  server: process.env.AUTH_DB_SERVER || "localhost",
  ...(process.env.AUTH_DB_PORT ? { port: Number(process.env.AUTH_DB_PORT) } : {}),
  database: process.env.AUTH_DB_NAME || "CPSTLPortalDB",
  user: process.env.AUTH_DB_USER || "CPSTLPortalApp",
  password: process.env.AUTH_DB_PASSWORD,
  options: {
    ...(!process.env.AUTH_DB_PORT && process.env.AUTH_DB_INSTANCE
      ? { instanceName: process.env.AUTH_DB_INSTANCE }
      : {}),
    encrypt: process.env.AUTH_DB_ENCRYPT === "true",
    trustServerCertificate: process.env.AUTH_DB_TRUST_CERTIFICATE !== "false",
  },
});

try {
  const accountResult = await pool
    .request()
    .input("identifier", sql.NVarChar(30), identifier)
    .query(`
      SELECT TOP (1) UserId, EmployeePIN, EmployeeEPF, RoleId
      FROM dbo.WebPortalUsers
      WHERE EmployeePIN = @identifier OR EmployeeEPF = @identifier;
    `);

  const account = accountResult.recordset[0];
  if (!account) throw new Error(`No portal account was found for ${identifier}.`);
  if (Number(account.RoleId) !== 2) throw new Error("Only employee accounts can be reset with this utility.");

  const temporaryPassword = String(account.EmployeePIN);
  const passwordHash = await argon2.hash(temporaryPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await new sql.Request(transaction)
      .input("userId", sql.Int, account.UserId)
      .input("passwordHash", sql.NVarChar(500), passwordHash)
      .query(`
        UPDATE dbo.WebPortalUsers
        SET PasswordHash = @passwordHash,
            MustChangePassword = 1,
            FailedLoginCount = 0,
            LockedUntil = NULL,
            UpdatedAt = SYSDATETIME()
        WHERE UserId = @userId;
      `);

    await new sql.Request(transaction)
      .input("userId", sql.Int, account.UserId)
      .query(`
        UPDATE dbo.WebPortalSessions
        SET RevokedAt = SYSDATETIME()
        WHERE UserId = @userId AND RevokedAt IS NULL;
      `);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  console.log("Employee password reset completed.");
  console.log({
    employeePIN: temporaryPassword,
    employeeEPF: account.EmployeeEPF ?? null,
    mustChangePassword: true,
    existingSessionsRevoked: true,
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.close();
}
