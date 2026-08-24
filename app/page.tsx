"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminUnknownFingerprints from "./AdminUnknownFingerprints";

const workforce = [
  { initials: "NP", name: "Nimal Perera", id: "CPSTL-1042", department: "Terminal Operations", checkIn: "07:28 AM", checkOut: "—", status: "Present" },
  { initials: "SD", name: "Saman Dissanayake", id: "CPSTL-0876", department: "Engineering", checkIn: "07:34 AM", checkOut: "—", status: "Present" },
  { initials: "IF", name: "Ishara Fernando", id: "CPSTL-1218", department: "Safety & Compliance", checkIn: "07:49 AM", checkOut: "—", status: "Late" },
  { initials: "RK", name: "Ruwan Kumara", id: "CPSTL-0965", department: "Loading Bay", checkIn: "08:02 AM", checkOut: "—", status: "Late" },
  { initials: "AM", name: "Ayesha Madushani", id: "CPSTL-1107", department: "Administration", checkIn: "07:25 AM", checkOut: "12:18 PM", status: "Half day" },
];

type AttendanceRecord = {
  logTime: string; verifyMode: string; deviceSerial: string; deviceIP: string;
  deviceLocation: string; deviceLabel: string; imageName: string | null;
  capturedImage: string | null;
};

type EmployeeResponse = {
  employee: {
    epf: string | null; pin: string; name: string | null; mobileNumber: string | null;
    phoneNumber: string | null; email: string | null; location: string | null;
    branch: string | null; position: string | null; active: number | boolean | null;
    deviceName: string | null; deviceType: string | null; profileImage: string | null;
  };
  attendance: AttendanceRecord[];
};

const initials = (name?: string | null) => (name || "Employee").split(/[ .]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const formatLogTime = (value: string) => new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
}).format(new Date(value));

const colomboDateTimeParts = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const today = new Date();
const todayValue = toDateInputValue(today);
const currentMonthValue = todayValue.slice(0, 7);
const currentMonthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(today);
const monthOptions = Array.from({ length: 4 }, (_, index) => {
  const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
  return {
    value: toDateInputValue(date).slice(0, 7),
    label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(date),
  };
});

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [employeeId, setEmployeeId] = useState("1042");
  const [password, setPassword] = useState("");
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [endDate, setEndDate] = useState(todayValue);
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [employeeData, setEmployeeData] = useState<EmployeeResponse | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const selectedMonthStart = `${selectedMonth}-01`;

  const apiUrl = process.env.NEXT_PUBLIC_ATTENDANCE_API_URL || "http://localhost:4000";

  async function loadMyAttendance() {
    const dateRange = new URLSearchParams({ startDate: selectedMonthStart, endDate });
    const response = await fetch(`${apiUrl}/api/me/attendance?${dateRange}`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to load attendance records.");
    setEmployeeData(result);
    setLastUpdatedAt(new Date());
    setRole("employee");
    setSignedIn(true);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: employeeId.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      setRole(result.role === "Admin" ? "admin" : "employee");
      if (result.requiresPasswordChange) {
        setCurrentPassword(password);
        setRequiresPasswordChange(true);
      } else if (result.role === "Admin") {
        setSignedIn(true);
      } else {
        await loadMyAttendance();
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to connect to the attendance server.");
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    if (newPassword !== confirmPassword) {
      setLoginError("The new password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to change the password.");
      setRequiresPasswordChange(false);
      setPassword("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (result.role === "Admin") {
        setRole("admin");
        setSignedIn(true);
      } else {
        await loadMyAttendance();
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to change the password.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      await fetch(`${apiUrl}/api/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      setSignedIn(false);
      setEmployeeData(null);
      setPassword("");
    }
  }

  useEffect(() => {
    if (!signedIn || role !== "employee") return undefined;

    const refreshAttendance = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const dateRange = new URLSearchParams({ startDate: selectedMonthStart, endDate });
        const response = await fetch(`${apiUrl}/api/me/attendance?${dateRange}`, { credentials: "include" });
        if (!response.ok) return;
        setEmployeeData(await response.json());
        setLastUpdatedAt(new Date());
      } catch {
        // Keep the last successfully loaded records when a background refresh fails.
      }
    };

    const intervalId = window.setInterval(refreshAttendance, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshAttendance();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [apiUrl, endDate, role, selectedMonthStart, signedIn]);

  if (requiresPasswordChange) return (
    <main className="login-shell">
      <section className="brand-panel"><div className="brand-glow" /><div className="brand-copy"><img className="login-logo" src="/cpstl-logo.png" alt="Ceylon Petroleum Storage Terminals Limited" /><p className="eyebrow light">SECURE FIRST LOGIN</p><h1>Create your<br /><span>private password.</span></h1><p className="brand-description">Your Employee EPF or PIN was a temporary password. Replace it before opening your attendance dashboard.</p></div><p className="brand-footer">Ceylon Petroleum Storage Terminals Limited</p></section>
      <section className="login-panel"><div className="login-card"><p className="eyebrow">PASSWORD CHANGE REQUIRED</p><h2>Secure your account</h2><p className="login-intro">Choose a password with at least 4 characters. It cannot be your Employee PIN or EPF.</p><form onSubmit={changePassword}><label htmlFor="current-password">Current temporary password</label><div className="input-wrap"><span>●</span><input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></div><label htmlFor="new-password">New password</label><div className="input-wrap"><span>●</span><input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={4} required /></div><label htmlFor="confirm-password">Confirm new password</label><div className="input-wrap"><span>●</span><input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={4} required /></div>{loginError && <p className="login-error" role="alert">{loginError}</p>}<button className="primary-button" type="submit" disabled={loading}>{loading ? "Changing password..." : "Change password and continue"} <span>{loading ? "" : "→"}</span></button></form></div></section>
    </main>
  );

  if (!signedIn) return (
    <main className="login-shell">
      <section className="brand-panel"><div className="brand-glow" /><div className="brand-copy"><img className="login-logo" src="/cpstl-logo.png" alt="Ceylon Petroleum Storage Terminals Limited" /><p className="eyebrow light">CPSTL EMPLOYEE PORTAL</p><h1>Your attendance,<br /><span>clear and accessible.</span></h1><p className="brand-description">Securely review your fingerprint records, working hours, punctuality, and leave information.</p><div className="brand-stats"><div><strong>24/7</strong><span>Access</span></div><div><strong>Live</strong><span>Records</span></div><div><strong>Secure</strong><span>Account</span></div></div></div><p className="brand-footer">Ceylon Petroleum Storage Terminals Limited</p></section>
      <section className="login-panel"><div className="login-card"><div className="mobile-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><span>CPSTL</span></div><p className="eyebrow">EMPLOYEE ATTENDANCE LOGIN</p><h2>Welcome</h2><p className="login-intro">Sign in with your Employee EPF or PIN and password, then select the attendance period.</p><form onSubmit={signIn}><label htmlFor="employee-id">Employee EPF or PIN</label><div className="input-wrap epf-input"><span>ID</span><input id="employee-id" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} placeholder="Enter EPF or Employee PIN" autoComplete="username" required /></div><label htmlFor="employee-password">Password</label><div className="input-wrap"><span>●</span><input id="employee-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required /></div><div className="date-range"><div><label htmlFor="attendance-month">Starting month</label><select id="attendance-month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}</select></div><div><label htmlFor="period-end">Period ends</label><input id="period-end" type="date" value={endDate} min={selectedMonthStart} max={todayValue} onChange={(event) => setEndDate(event.target.value)} required /></div></div><p className="date-range-note">First login uses your EmployeePIN as the temporary password. You will be required to change it.</p>{loginError && <p className="login-error" role="alert">{loginError}</p>}<button className="primary-button" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in to attendance"} <span>{loading ? "" : "→"}</span></button></form><p className="support epf-support">Employee not recognized? <a href="mailto:ithelpdesk@cpstl.lk">Contact IT Helpdesk</a></p></div></section>
    </main>
  );

  if (role === "admin") return <AdminUnknownFingerprints apiUrl={apiUrl} onSignOut={signOut} />;

  const employee = employeeData!.employee;
  const attendanceRecords = employeeData!.attendance;
  const employeeName = employee.name || `Employee ${employee.pin}`;
  const dailyScans = new Map<string, number[]>();
  attendanceRecords.forEach((record) => {
    const scan = colomboDateTimeParts(record.logTime);
    dailyScans.set(scan.date, [...(dailyScans.get(scan.date) || []), scan.minutes]);
  });
  const currentMonthDaysPresent = Array.from(dailyScans.keys()).filter((date) => date.startsWith(currentMonthValue)).length;
  const currentMonthWorkMinutes = Array.from(dailyScans.entries()).reduce((total, [date, scans]) => {
    if (!date.startsWith(currentMonthValue) || scans.length < 2) return total;
    const orderedScans = [...scans].sort((a, b) => a - b);
    return total + orderedScans[orderedScans.length - 1] - orderedScans[0];
  }, 0);
  const currentMonthWorkHours = Math.floor(currentMonthWorkMinutes / 60);
  const currentMonthRemainingMinutes = currentMonthWorkMinutes % 60;
  const currentMonthDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const leadingCalendarCells = (new Date(today.getFullYear(), today.getMonth(), 1).getDay() + 6) % 7;
  const currentMonthCalendar = [
    ...Array.from({ length: leadingCalendarCells }, () => null),
    ...Array.from({ length: currentMonthDays }, (_, index) => {
      const day = index + 1;
      const dateKey = `${currentMonthValue}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(today.getFullYear(), today.getMonth(), day).getDay();
      const state = dailyScans.has(dateKey) ? "present" : dateKey > todayValue ? "future" : dayOfWeek === 0 || dayOfWeek === 6 ? "weekend" : "no-record";
      return { day, state };
    }),
  ];

  return (
    <main className="dashboard-shell employee-dashboard">
      <aside className="sidebar"><div className="sidebar-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><div><strong>CPSTL</strong><span>Employee Portal</span></div></div><nav><p>MY WORKSPACE</p><button className="nav-active"><span>▦</span> My Attendance</button></nav><div className="sidebar-bottom"><button onClick={signOut}><span>↪</span> Sign out</button></div></aside>
      <section className="dashboard-main"><header className="topbar"><div className="dashboard-logo-mobile"><img src="/cpstl-logo.png" alt="CPSTL" /></div><div className="status-pill"><i /> Live records · {lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Connected"}</div><div className="top-actions"><div className="avatar">{initials(employeeName)}</div><div className="user-name"><strong>{employeeName}</strong><span>{employee.epf ? `EPF ${employee.epf}` : `PIN ${employee.pin}`}</span></div></div></header>
        <div className="dashboard-content"><div className="welcome-row"><div><p className="eyebrow">EMPLOYEE ATTENDANCE</p><h1>Welcome, {employeeName}.</h1><p>Your employee profile and fingerprint attendance records.</p></div></div>
          <form className="admin-filters panel" style={{ gridTemplateColumns: "220px 220px 110px" }} onSubmit={(event) => { event.preventDefault(); loadMyAttendance().catch((error) => setLoginError(error instanceof Error ? error.message : "Unable to load attendance records.")); }}><label>Starting month<select style={{ height: 40, padding: "0 11px", border: "1px solid #dfe2e7", borderRadius: 7, background: "white" }} value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}</select></label><label>Period ends<input type="date" value={endDate} min={selectedMonthStart} max={todayValue} onChange={(event) => setEndDate(event.target.value)} /></label><button type="submit">Show</button></form>
          {loginError && <p className="login-error" role="alert">{loginError}</p>}
          <section className="employee-details-card panel"><div className="profile-image-wrap">{employee.profileImage ? <img src={employee.profileImage} alt={`${employeeName} profile`} /> : <div className="no-profile-image"><span>{initials(employeeName)}</span><small>No profile image</small></div>}</div><div className="employee-primary"><p className="eyebrow">EMPLOYEE PROFILE</p><h2>{employeeName}</h2><span>EPF {employee.epf || "Not available"} · PIN {employee.pin}</span><span className="active-employee">● {employee.active === 0 || employee.active === false ? "Inactive employee" : "Active employee"}</span></div><dl><div><dt>Location</dt><dd>{employee.location || "Not available"}</dd></div><div><dt>Branch</dt><dd>{employee.branch || "Not available"}</dd></div><div><dt>Position</dt><dd>{employee.position || "Not available"}</dd></div><div><dt>Email</dt><dd>{employee.email || "Not available"}</dd></div><div><dt>Mobile</dt><dd>{employee.mobileNumber || employee.phoneNumber || "Not available"}</dd></div><div><dt>Device</dt><dd>{employee.deviceName || employee.deviceType || "Not available"}</dd></div></dl></section>
          <section className="metric-grid attendance-metrics"><article><div className="metric-icon red">✓</div><div><span>Days present</span><strong>{currentMonthDaysPresent} <small>days in {currentMonthLabel}</small></strong><p className="up">Based on fingerprint records</p></div></article><article><div className="metric-icon green">◷</div><div><span>Working hours</span><strong>{currentMonthWorkHours}h {currentMonthRemainingMinutes}m</strong><p>First to last fingerprint · {currentMonthLabel}</p></div></article></section>
          <div className="employee-grid"><section className="panel today-card"><div className="panel-title"><div><h2>Today&apos;s attendance</h2><p>Your live fingerprint status</p></div><span className="attendance-tag">Present</span></div><div className="today-timeline"><div className="timeline-event done"><span>◎</span><div><small>CHECK IN</small><strong>07:28 AM</strong><p>Fingerprint Device 01 · Main Gate</p></div></div><i /><div className="timeline-event"><span>◷</span><div><small>CHECK OUT</small><strong>Pending</strong><p>Expected after 04:30 PM</p></div></div></div><div className="worked-progress"><span><b>Time worked today</b><strong>4h 52m / 9h</strong></span><div><i style={{width:"54%"}} /></div></div></section>
            <section className="panel calendar-card"><div className="panel-title"><div><h2>{currentMonthLabel}</h2><p>Fingerprint attendance for the current month</p></div></div><div className="calendar-head">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{currentMonthCalendar.map((item, index) => <div key={index} className={item ? item.state : "empty"}>{item?.day}</div>)}</div><div className="calendar-legend"><span><i className="present" /> Present</span><span><i className="no-record" /> No record</span></div></section></div>
          <section className="panel attendance-panel"><div className="panel-title attendance-heading"><div><h2>My fingerprint attendance</h2><p>{attendanceRecords.length} deduplicated attendance records loaded · Select a record to view details</p></div></div><div className="database-attendance-table"><div className="database-attendance-row table-head"><span>Captured employee</span><span>Date and time</span><span>Verification</span><span>Device</span><span>Location</span></div>{attendanceRecords.map((record, index) => <div className="database-attendance-row attendance-record-button" role="button" tabIndex={0} aria-label={`View attendance record captured at ${formatLogTime(record.logTime)}`} onClick={() => setSelectedAttendance(record)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedAttendance(record); } }} key={`${record.logTime}-${record.deviceSerial}-${index}`}><div className="capture-cell">{record.capturedImage ? <img src={record.capturedImage} alt={`Captured at ${formatLogTime(record.logTime)}`} /> : <div className="capture-placeholder">No image</div>}<small>{record.imageName || "No captured image"}</small></div><strong>{formatLogTime(record.logTime)}</strong><span className="attendance-tag">{record.verifyMode || "Fingerprint"}</span><div><strong>{record.deviceLabel || record.deviceSerial}</strong><small>{record.deviceIP}</small></div><span>{record.deviceLocation || "Not available"}</span></div>)}</div>{attendanceRecords.length === 0 && <div className="empty-attendance">No attendance records were found for this EPF.</div>}</section>
        </div>
      </section>
      {selectedAttendance && <div className="attendance-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedAttendance(null); }}><section className="attendance-modal" role="dialog" aria-modal="true" aria-labelledby="attendance-detail-title"><header><div><p className="eyebrow">FINGERPRINT RECORD</p><h2 id="attendance-detail-title">Attendance details</h2></div><button type="button" aria-label="Close attendance details" onClick={() => setSelectedAttendance(null)}>×</button></header><div className="attendance-modal-body"><div className="attendance-modal-image">{selectedAttendance.capturedImage ? <img src={selectedAttendance.capturedImage} alt={`Employee captured at ${formatLogTime(selectedAttendance.logTime)}`} /> : <div className="capture-placeholder">No captured image</div>}<span>Captured employee image</span></div><dl><div><dt>Date and time</dt><dd>{formatLogTime(selectedAttendance.logTime)}</dd></div><div><dt>Verification</dt><dd><span className="attendance-tag">{selectedAttendance.verifyMode || "Fingerprint"}</span></dd></div><div><dt>Device</dt><dd>{selectedAttendance.deviceLabel || selectedAttendance.deviceSerial || "Not available"}</dd></div><div><dt>Location</dt><dd>{selectedAttendance.deviceLocation || "Not available"}</dd></div></dl></div><footer><button type="button" onClick={() => setSelectedAttendance(null)}>Close</button></footer></section></div>}
    </main>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- retained until the full workforce admin module is connected
function AdminDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = workforce.filter((row) => `${row.name} ${row.id} ${row.department}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="dashboard-shell admin-dashboard"><aside className="sidebar"><div className="sidebar-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><div><strong>CPSTL</strong><span>Admin Portal</span></div></div><nav><p>WORKFORCE</p><button className="nav-active"><span>▦</span> Attendance Overview</button><button><span>◎</span> Live Attendance</button><button><span>♙</span> Employees</button><button><span>▤</span> Reports</button><p>MANAGEMENT</p><button><span>◷</span> Shifts & Rosters</button><button><span>▣</span> Fingerprint Devices</button><button><span>✓</span> Leave Management</button></nav><div className="sidebar-bottom"><button><span>⚙</span> Settings</button><button onClick={onSignOut}><span>↪</span> Sign out</button></div></aside><section className="dashboard-main"><header className="topbar"><div className="dashboard-logo-mobile"><img src="/cpstl-logo.png" alt="CPSTL" /></div><div className="status-pill"><i /> 6 fingerprint devices online</div><div className="top-actions"><button aria-label="Notifications">♢<b>3</b></button><div className="avatar">AK</div><div className="user-name"><strong>Attendance Admin</strong><span>Full workforce access</span></div></div></header><div className="dashboard-content"><div className="welcome-row"><div><p className="eyebrow">THURSDAY, 20 AUGUST 2026</p><h1>Attendance administration</h1><p>Monitor fingerprint attendance across all CPSTL employees and locations.</p></div><button className="outline-button">↥ Export full report</button></div><div className="admin-access-banner"><span>✓</span><div><strong>Administrator access</strong><p>You can view all employees, attendance records, shifts, leave, and device activity.</p></div></div><section className="metric-grid"><article><div className="metric-icon red">◎</div><div><span>Present today</span><strong>1,086 <small>employees</small></strong><p className="up">87.0% attendance rate</p></div></article><article><div className="metric-icon green">✓</div><div><span>On time</span><strong>1,012 <small>employees</small></strong><p>93.2% of check-ins</p></div></article><article><div className="metric-icon amber">◷</div><div><span>Late arrivals</span><strong>74 <small>employees</small></strong><p>6.8% of check-ins</p></div></article><article><div className="metric-icon blue">—</div><div><span>Absent today</span><strong>162 <small>employees</small></strong><p>96 on approved leave</p></div></article></section><section className="panel attendance-panel"><div className="panel-title attendance-heading"><div><h2>All employee attendance</h2><p>Live fingerprint records across the workforce</p></div><div className="attendance-tools"><input aria-label="Search employees" placeholder="Search employee..." value={query} onChange={(event) => setQuery(event.target.value)} /><button>Today⌄</button></div></div><div className="attendance-table"><div className="attendance-row table-head"><span>Employee</span><span>Department</span><span>Check in</span><span>Check out</span><span>Status</span></div>{filtered.map(row => <div className="attendance-row" key={row.id}><div className="employee-cell"><span>{row.initials}</span><div><strong>{row.name}</strong><small>{row.id}</small></div></div><span>{row.department}</span><strong>{row.checkIn}</strong><span>{row.checkOut}</span><span className={`attendance-tag ${row.status.toLowerCase().replace(" ", "-")}`}>{row.status}</span></div>)}</div><button className="view-records">View all employee records →</button></section><section className="quick-section"><div className="panel-title"><div><h2>Admin actions</h2><p>Manage workforce attendance</p></div></div><div className="quick-grid"><button><span>＋</span><div><strong>Register employee</strong><small>Enroll a new fingerprint</small></div><b>→</b></button><button><span>▤</span><div><strong>Generate report</strong><small>Export workforce attendance</small></div><b>→</b></button><button><span>◷</span><div><strong>Manage shifts</strong><small>Update rosters and schedules</small></div><b>→</b></button></div></section></div></section></main>;
}
