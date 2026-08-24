import argon2 from "argon2";
import sql from "mssql";

const requiredEnvironment = [
  "LOCAL_DB_SERVER",
  "LOCAL_DB_NAME",
  "LOCAL_DB_USER",
  "LOCAL_DB_PASSWORD",
];

for (const key of requiredEnvironment) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (process.env.LOCAL_DB_PASSWORD === "REPLACE_WITH_THE_IMPORTER_PASSWORD") {
  throw new Error(
    "Replace LOCAL_DB_PASSWORD in .env.local-import with the password created for CPSTLPortalImporter.",
  );
}

const pool = await sql.connect({
  server: process.env.LOCAL_DB_SERVER,
  database: process.env.LOCAL_DB_NAME,
  user: process.env.LOCAL_DB_USER,
  password: process.env.LOCAL_DB_PASSWORD,
  options: {
    instanceName: process.env.LOCAL_DB_INSTANCE || "SQLEXPRESS",
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    min: 1,
    max: 5,
    idleTimeoutMillis: 30000,
  },
});

try {
  const employeeResult = await pool.request().query(`
    SELECT DISTINCT
      NULLIF(LTRIM(RTRIM(EmployeePIN)), N'') AS EmployeePIN,
      CASE
        WHEN EmployeeEPF IS NULL THEN NULL
        WHEN UPPER(LTRIM(RTRIM(EmployeeEPF))) IN (N'', N'NULL') THEN NULL
        ELSE LTRIM(RTRIM(EmployeeEPF))
      END AS EmployeeEPF
    FROM dbo.EmployeeImportUpload
    WHERE EmployeePIN IS NOT NULL
      AND LTRIM(RTRIM(EmployeePIN)) <> N''
    ORDER BY EmployeePIN;
  `);

  const employees = employeeResult.recordset.map((employee) => ({
    pin: String(employee.EmployeePIN).trim(),
    epf: employee.EmployeeEPF == null ? null : String(employee.EmployeeEPF).trim(),
  }));

  const sourcePins = new Set();
  const sourceEpfs = new Map();

  for (const employee of employees) {
    if (sourcePins.has(employee.pin)) {
      throw new Error(`Duplicate EmployeePIN found in import data: ${employee.pin}`);
    }
    sourcePins.add(employee.pin);

    if (employee.epf) {
      const existingPin = sourceEpfs.get(employee.epf);
      if (existingPin && existingPin !== employee.pin) {
        throw new Error(
          `Duplicate EmployeeEPF ${employee.epf} belongs to PIN ${existingPin} and ${employee.pin}.`,
        );
      }
      sourceEpfs.set(employee.epf, employee.pin);
    }
  }

  const existingResult = await pool.request().query(`
    SELECT EmployeePIN, EmployeeEPF
    FROM dbo.WebPortalUsers;
  `);

  const existingPins = new Set(
    existingResult.recordset.map((row) => String(row.EmployeePIN).trim()),
  );
  const existingEpfs = new Map(
    existingResult.recordset
      .filter((row) => row.EmployeeEPF != null)
      .map((row) => [String(row.EmployeeEPF).trim(), String(row.EmployeePIN).trim()]),
  );

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Found ${employees.length} employees ready for provisioning.`);

  for (let index = 0; index < employees.length; index += 1) {
    const employee = employees[index];

    if (existingPins.has(employee.pin)) {
      skipped += 1;
      continue;
    }

    if (employee.epf && existingEpfs.has(employee.epf)) {
      failed += 1;
      console.error(
        `Skipped PIN ${employee.pin}: EPF ${employee.epf} is already assigned to PIN ${existingEpfs.get(employee.epf)}.`,
      );
      continue;
    }

    try {
      // Every employee's first-time temporary password is their EmployeePIN.
      const passwordHash = await argon2.hash(employee.pin, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      await pool
        .request()
        .input("employeePIN", sql.NVarChar(30), employee.pin)
        .input("employeeEPF", sql.NVarChar(30), employee.epf)
        .input("passwordHash", sql.NVarChar(500), passwordHash)
        .query(`
          INSERT INTO dbo.WebPortalUsers
          (
            EmployeePIN,
            EmployeeEPF,
            RoleId,
            PasswordHash,
            MustChangePassword,
            IsActive
          )
          VALUES
          (
            @employeePIN,
            @employeeEPF,
            2,
            @passwordHash,
            1,
            1
          );
        `);

      inserted += 1;
      existingPins.add(employee.pin);
      if (employee.epf) existingEpfs.set(employee.epf, employee.pin);
    } catch (error) {
      failed += 1;
      console.error(`Failed PIN ${employee.pin}: ${error.message}`);
    }

    if ((index + 1) % 100 === 0) {
      console.log(`Processed ${index + 1}/${employees.length}`);
    }
  }

  console.log("Employee provisioning completed.");
  console.log({ sourceEmployees: employees.length, inserted, skipped, failed });

  if (failed > 0) process.exitCode = 1;
} finally {
  await pool.close();
}
