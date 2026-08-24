# CPSTL Fingerprint Attendance Portal

A secure employee attendance portal for Ceylon Petroleum Storage Terminals Limited (CPSTL). The application connects to ZKTeco fingerprint attendance data and provides role-based dashboards for employees and administrators.

## Main Features

### Employee portal

- Sign in using Employee EPF or Employee PIN.
- Automatically create a portal account on the employee's first verified login.
- Require a private password change after first login or an administrator reset.
- Display employee details and profile image when available.
- View fingerprint attendance and captured employee images.
- Filter attendance by starting month and period end date.
- Show days present, working hours, monthly calendar, device, and location details.
- Refresh attendance automatically every 30 seconds without reloading the page.
- Limit employee history to the current month and previous three months.

### Administrator portal

- Role-protected administrator access.
- Search attendance by employee name, EPF, or PIN.
- View attendance across all employees and all historical periods.
- Browse large result sets using pagination.
- Open a record to inspect employee, fingerprint, device, location, and captured-image details.
- Review images where the fingerprint device recorded the employee as `UNKNOWN`.
- Filter unknown fingerprint images by a single selected date.
- Refresh the active administrator view automatically every 30 seconds.

## Architecture

```text
Employee or administrator browser
              |
              v
React / Vinext frontend (port 3000)
              |
              v
Node.js / Express API (port 4000)
          /                 \
         v                   v
ZKTecoDB                 CPSTLPortalDB
Attendance data          Users, roles and sessions
```

The browser never connects directly to SQL Server. Database credentials and all authorization checks remain in the backend API.

## Technology Stack

- React 19
- Vinext and Vite
- Node.js 22+
- Express
- Microsoft SQL Server
- `mssql` / Tedious SQL Server driver
- Argon2id password hashing
- Cookie-based server sessions
- TypeScript and ESLint

## Database Integration

### ZKTecoDB

The API reads fingerprint and employee information from these SQL Server views:

- `dbo.View_EmployeeAttendanceLog_toWebDashBoard`
- `dbo.View_EmployeeProfileImage_toWebDashBoard`
- `dbo.View_EmployeeAttendanceImagesLog_toWebDashBoard`

`ZKTecoDB` remains the authoritative source for employee identity, attendance, profile images, and captured fingerprint images.

### CPSTLPortalDB

Portal authentication data is stored separately:

- `dbo.WebPortalUsers`
- `dbo.WebPortalRoles`
- `dbo.WebPortalSessions`

Passwords are stored only as Argon2id hashes. Existing passwords cannot be recovered; administrators reset an account to a temporary credential and force the employee to choose a new password.

## Authentication Workflow

1. An employee submits an EPF/PIN and password.
2. The API checks `CPSTLPortalDB.dbo.WebPortalUsers`.
3. If the account does not exist, the API verifies the employee against `ZKTecoDB`.
4. The employee may use their EPF or PIN as the first temporary password.
5. The API creates an Employee account and requires an immediate password change.
6. Future logins use the employee's private password.
7. Five failed attempts temporarily lock the account for 15 minutes.
8. Successful authentication creates an HTTP-only session cookie.

Administrators are authorized on the backend using their `Admin` database role. Hiding administrator controls in the frontend is not treated as a security boundary.

## Prerequisites

- Node.js `>=22.13.0`
- npm
- Microsoft SQL Server reachable from the API server
- `ZKTecoDB` attendance views
- `CPSTLPortalDB` authentication tables and roles
- SQL logins with only the permissions required by the application

## Installation

```powershell
git clone YOUR_PRIVATE_REPOSITORY_URL
cd cpstl-fingerprint-attendance
npm install
Copy-Item .env.example .env
```

Edit `.env` and replace every placeholder with the correct server configuration. Never commit `.env`.

## Environment Configuration

```env
# ZKTeco attendance database
DB_SERVER=YOUR_SQL_SERVER
DB_PORT=1433
DB_NAME=ZKTecoDB
DB_USER=YOUR_READ_ONLY_ATTENDANCE_USER
DB_PASSWORD=YOUR_ATTENDANCE_DATABASE_PASSWORD
DB_ENCRYPT=false
DB_TRUST_CERTIFICATE=true

# Portal authentication database
AUTH_DB_SERVER=YOUR_SQL_SERVER
AUTH_DB_PORT=1433
AUTH_DB_NAME=CPSTLPortalDB
AUTH_DB_USER=CPSTLPortalApp
AUTH_DB_PASSWORD=YOUR_PORTAL_DATABASE_PASSWORD
AUTH_DB_ENCRYPT=false
AUTH_DB_TRUST_CERTIFICATE=true

# Application
SESSION_COOKIE_NAME=cpstl_session
SESSION_DURATION_HOURS=8
API_PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
NEXT_PUBLIC_ATTENDANCE_API_URL=http://localhost:4000
NODE_ENV=development
```

Use either `AUTH_DB_PORT` or `AUTH_DB_INSTANCE` as appropriate for the SQL Server installation. Do not configure an incorrect named instance together with a port.

## Database Setup

Run the authentication runtime script in SQL Server Management Studio using an account permitted to create users and grant database permissions:

```text
database/employee-auth-runtime.sql
```

The application database login requires only the permissions needed to read/update portal users, manage sessions, read roles, and read the approved ZKTeco views. Do not run the web application using a SQL Server administrator account.

## Running Locally

Start the API in the first terminal:

```powershell
npm run server:start
```

Start the frontend in a second terminal:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

The API health endpoint is:

```text
http://localhost:4000/health
```

## Password Reset

An authorized IT administrator can reset an employee using either EPF or PIN:

```powershell
node --env-file=.env scripts/reset-employee-password.mjs EMPLOYEE_EPF_OR_PIN
```

The reset utility:

- creates a temporary Argon2id password hash;
- sets `MustChangePassword = 1`;
- clears failed-login locks; and
- revokes existing sessions.

Verify the employee's identity before resetting an account. Never disclose or attempt to retrieve the previous password.

## Useful Commands

```powershell
npm run dev          # Start the Vinext frontend
npm run server:start # Start the attendance API
npm run build        # Create and verify the production build
npm run lint         # Run ESLint
npm test             # Run the project test command
```

## Production Deployment

Recommended production arrangement:

- Host the frontend and Node.js API on an internal Windows Server.
- Keep both SQL databases on the protected SQL Server network.
- Use HTTPS through IIS or another reverse proxy.
- Restrict access to the CPSTL network or approved VPN users.
- Run the Node.js API as a managed Windows service.
- Store environment secrets outside source control.
- Back up `CPSTLPortalDB` and test account-recovery procedures.

The frontend may be built with Sites/Vinext, but Sites hosting cannot directly open raw TCP connections to an internal SQL Server. The Express API must remain on an authorized server reachable through a secure HTTP endpoint.

## Security Notes

- Keep the GitHub repository private.
- Never commit `.env`, SQL passwords, exported employee data, or captured fingerprint images.
- Rotate any credential that has previously been committed or shared.
- Use least-privilege SQL accounts.
- Use HTTPS and secure cookies in production.
- Restrict CORS to the real frontend origin.
- Treat profile and fingerprint images as confidential employee data.
- Record administrator password-reset activity in the operational help-desk process.
- Review account roles and deactivate former employees promptly.

## Repository Name

Recommended GitHub repository name:

```text
cpstl-fingerprint-attendance
```

## License and Use

This project is intended for authorized internal CPSTL use. Add the organization's approved license and data-handling policy before distributing the source code.
