import argon2 from "argon2";
import sql from "mssql";

if (!process.env.AUTH_DB_PASSWORD) {
  console.error("Missing required environment variable: AUTH_DB_PASSWORD");
  process.exit(1);
}

if (process.argv[2] !== "--confirm") {
  console.error(
    "This resets every active employee to first-login mode. The employee PIN or EPF can be used as the temporary password. " +
      "Run again with --confirm to continue.",
  );
  process.exit(1);
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
  const result = await pool.request().query(`
    SELECT UserId, EmployeePIN, EmployeeEPF
    FROM dbo.WebPortalUsers
    WHERE RoleId = 2
      AND IsActive = 1
      AND NULLIF(LTRIM(RTRIM(EmployeePIN)), '') IS NOT NULL
    ORDER BY UserId;
  `);

  if (result.recordset.length === 0) {
    console.log("No active employee accounts were found.");
    process.exitCode = 0;
  } else {
    let resetCount = 0;

    for (const account of result.recordset) {
      const temporaryPassword = String(account.EmployeePIN).trim();
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

            UPDATE dbo.WebPortalSessions
            SET RevokedAt = SYSDATETIME()
            WHERE UserId = @userId AND RevokedAt IS NULL;
          `);

        await transaction.commit();
        resetCount += 1;
      } catch (error) {
        await transaction.rollback();
        throw new Error(
          `Reset failed for employee PIN ${temporaryPassword}: ${error.message}`,
        );
      }
    }

    console.log(`Reset completed for ${resetCount} active employee account(s).`);
    console.log("Temporary password: each employee's PIN or EPF.");
    console.log("All affected employees must change their password at next login.");
    console.log("Administrator accounts were not changed.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.close();
}
