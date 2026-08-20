"use client";

import { FormEvent, useState } from "react";

const calendar = [
  ...Array(5).fill(null),
  ...Array.from({ length: 20 }, (_, index) => ({ day: index + 1, state: [4, 11].includes(index + 1) ? "late" : [7, 8, 14, 15].includes(index + 1) ? "weekend" : index + 1 === 12 ? "leave" : "present" })),
  ...Array(10).fill(null),
];

const workforce = [
  { initials: "NP", name: "Nimal Perera", id: "CPSTL-1042", department: "Terminal Operations", checkIn: "07:28 AM", checkOut: "—", status: "Present" },
  { initials: "SD", name: "Saman Dissanayake", id: "CPSTL-0876", department: "Engineering", checkIn: "07:34 AM", checkOut: "—", status: "Present" },
  { initials: "IF", name: "Ishara Fernando", id: "CPSTL-1218", department: "Safety & Compliance", checkIn: "07:49 AM", checkOut: "—", status: "Late" },
  { initials: "RK", name: "Ruwan Kumara", id: "CPSTL-0965", department: "Loading Bay", checkIn: "08:02 AM", checkOut: "—", status: "Late" },
  { initials: "AM", name: "Ayesha Madushani", id: "CPSTL-1107", department: "Administration", checkIn: "07:25 AM", checkOut: "12:18 PM", status: "Half day" },
];

type EmployeeResponse = {
  employee: {
    epf: string; pin: string; name: string; mobileNumber: string | null;
    phoneNumber: string | null; email: string | null; location: string | null;
    branch: string | null; position: string | null; active: number | boolean | null;
    deviceName: string | null; deviceType: string | null; profileImage: string | null;
  };
  attendance: Array<{
    logTime: string; verifyMode: string; deviceSerial: string; deviceIP: string;
    deviceLocation: string; deviceLabel: string; imageName: string | null;
    capturedImage: string | null;
  }>;
};

const initials = (name?: string) => (name || "Employee").split(/[ .]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const formatLogTime = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [employeeId, setEmployeeId] = useState("1042");
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [employeeData, setEmployeeData] = useState<EmployeeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const epf = employeeId.trim();
    setLoginError("");
    if (epf.toUpperCase() === "ADMIN-001") {
      setRole("admin");
      setSignedIn(true);
      return;
    }
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_ATTENDANCE_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/employees/${encodeURIComponent(epf)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Employee EPF was not found.");
      setEmployeeData(result);
      setRole("employee");
      setSignedIn(true);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to connect to the attendance server.");
    } finally {
      setLoading(false);
    }
  }

  if (!signedIn) return (
    <main className="login-shell">
      <section className="brand-panel"><div className="brand-glow" /><div className="brand-copy"><img className="login-logo" src="/cpstl-logo.png" alt="Ceylon Petroleum Storage Terminals Limited" /><p className="eyebrow light">CPSTL EMPLOYEE PORTAL</p><h1>Your attendance,<br /><span>clear and accessible.</span></h1><p className="brand-description">Securely review your fingerprint records, working hours, punctuality, and leave information.</p><div className="brand-stats"><div><strong>24/7</strong><span>Access</span></div><div><strong>Live</strong><span>Records</span></div><div><strong>Secure</strong><span>Account</span></div></div></div><p className="brand-footer">Ceylon Petroleum Storage Terminals Limited</p></section>
      <section className="login-panel"><div className="login-card"><div className="mobile-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><span>CPSTL</span></div><p className="eyebrow">EMPLOYEE ATTENDANCE LOOKUP</p><h2>Welcome</h2><p className="login-intro">Enter your Employee EPF number to load your attendance dashboard.</p><form onSubmit={signIn}><label htmlFor="employee-id">Employee EPF</label><div className="input-wrap epf-input"><span>EPF</span><input id="employee-id" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} placeholder="e.g. 16603" autoComplete="off" required /></div>{loginError && <p className="login-error" role="alert">{loginError}</p>}<button className="primary-button" type="submit" disabled={loading}>{loading ? "Loading employee records..." : "Load attendance dashboard"} <span>{loading ? "" : "→"}</span></button></form><p className="support epf-support">EPF not recognized? <a href="mailto:ithelpdesk@cpstl.lk">Contact IT Helpdesk</a></p></div></section>
    </main>
  );

  if (role === "admin") return <AdminDashboard onSignOut={() => setSignedIn(false)} />;

  const employee = employeeData!.employee;
  const attendanceRecords = employeeData!.attendance;

  return (
    <main className="dashboard-shell employee-dashboard">
      <aside className="sidebar"><div className="sidebar-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><div><strong>CPSTL</strong><span>Employee Portal</span></div></div><nav><p>MY WORKSPACE</p><button className="nav-active"><span>▦</span> My Attendance</button><button><span>◷</span> Attendance History</button><button><span>▤</span> My Leave</button><button><span>♙</span> My Profile</button><p>SUPPORT</p><button><span>?</span> Request Correction</button><button><span>☏</span> Help & Support</button></nav><div className="sidebar-bottom"><button><span>⚙</span> Settings</button><button onClick={() => setSignedIn(false)}><span>↪</span> Sign out</button></div></aside>
      <section className="dashboard-main"><header className="topbar"><div className="dashboard-logo-mobile"><img src="/cpstl-logo.png" alt="CPSTL" /></div><div className="status-pill"><i /> Attendance records connected</div><div className="top-actions"><button aria-label="Notifications">♢<b>1</b></button><div className="avatar">{initials(employee.name)}</div><div className="user-name"><strong>{employee.name}</strong><span>EPF {employee.epf}</span></div></div></header>
        <div className="dashboard-content"><div className="welcome-row"><div><p className="eyebrow">EMPLOYEE ATTENDANCE</p><h1>Welcome, {employee.name}.</h1><p>Your employee profile and fingerprint attendance records.</p></div><button className="outline-button">↥ Download my report</button></div>
          <section className="employee-details-card panel"><div className="profile-image-wrap">{employee.profileImage ? <img src={employee.profileImage} alt={`${employee.name} profile`} /> : <div className="no-profile-image"><span>{initials(employee.name)}</span><small>No profile image</small></div>}</div><div className="employee-primary"><p className="eyebrow">EMPLOYEE PROFILE</p><h2>{employee.name}</h2><span>EPF {employee.epf} · PIN {employee.pin}</span><span className="active-employee">● {employee.active === 0 || employee.active === false ? "Inactive employee" : "Active employee"}</span></div><dl><div><dt>Location</dt><dd>{employee.location || "Not available"}</dd></div><div><dt>Branch</dt><dd>{employee.branch || "Not available"}</dd></div><div><dt>Position</dt><dd>{employee.position || "Not available"}</dd></div><div><dt>Email</dt><dd>{employee.email || "Not available"}</dd></div><div><dt>Mobile</dt><dd>{employee.mobileNumber || employee.phoneNumber || "Not available"}</dd></div><div><dt>Device</dt><dd>{employee.deviceName || employee.deviceType || "Not available"}</dd></div></dl></section>
          <section className="metric-grid attendance-metrics"><article><div className="metric-icon red">✓</div><div><span>Days present</span><strong>18 <small>of 19 days</small></strong><p className="up">94.7% attendance</p></div></article><article><div className="metric-icon green">◷</div><div><span>Hours worked</span><strong>162h <small>this month</small></strong><p>Average 9h per day</p></div></article><article><div className="metric-icon amber">!</div><div><span>Late arrivals</span><strong>2 <small>this month</small></strong><p>18 minutes total</p></div></article><article><div className="metric-icon blue">▤</div><div><span>Leave balance</span><strong>12 <small>days remaining</small></strong><p>1 approved day in August</p></div></article></section>
          <div className="employee-grid"><section className="panel today-card"><div className="panel-title"><div><h2>Today&apos;s attendance</h2><p>Your live fingerprint status</p></div><span className="attendance-tag">Present</span></div><div className="today-timeline"><div className="timeline-event done"><span>◎</span><div><small>CHECK IN</small><strong>07:28 AM</strong><p>Fingerprint Device 01 · Main Gate</p></div></div><i /><div className="timeline-event"><span>◷</span><div><small>CHECK OUT</small><strong>Pending</strong><p>Expected after 04:30 PM</p></div></div></div><div className="worked-progress"><span><b>Time worked today</b><strong>4h 52m / 9h</strong></span><div><i style={{width:"54%"}} /></div></div></section>
            <section className="panel calendar-card"><div className="panel-title"><div><h2>August 2026</h2><p>Your monthly attendance</p></div><button>‹ &nbsp; ›</button></div><div className="calendar-head">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendar.map((item, index) => <div key={index} className={item ? item.state : "empty"}>{item?.day}</div>)}</div><div className="calendar-legend"><span><i className="present" /> Present</span><span><i className="late" /> Late</span><span><i className="leave" /> Leave</span></div></section></div>
          <section className="panel attendance-panel"><div className="panel-title attendance-heading"><div><h2>My fingerprint attendance</h2><p>{attendanceRecords.length} deduplicated attendance records loaded</p></div><button>View full history →</button></div><div className="database-attendance-table"><div className="database-attendance-row table-head"><span>Captured employee</span><span>Date and time</span><span>Verification</span><span>Device</span><span>Location</span></div>{attendanceRecords.map((record, index) => <div className="database-attendance-row" key={`${record.logTime}-${record.deviceSerial}-${index}`}><div className="capture-cell">{record.capturedImage ? <img src={record.capturedImage} alt={`Captured at ${formatLogTime(record.logTime)}`} /> : <div className="capture-placeholder">No image</div>}<small>{record.imageName || "No captured image"}</small></div><strong>{formatLogTime(record.logTime)}</strong><span className="attendance-tag">{record.verifyMode || "Fingerprint"}</span><div><strong>{record.deviceLabel || record.deviceSerial}</strong><small>{record.deviceIP}</small></div><span>{record.deviceLocation || "Not available"}</span></div>)}</div>{attendanceRecords.length === 0 && <div className="empty-attendance">No attendance records were found for this EPF.</div>}</section>
          <section className="quick-section"><div className="panel-title"><div><h2>Employee services</h2><p>Manage your attendance and leave</p></div></div><div className="quick-grid"><button><span>?</span><div><strong>Request correction</strong><small>Report a missing fingerprint record</small></div><b>→</b></button><button><span>▤</span><div><strong>Apply for leave</strong><small>Submit a new leave request</small></div><b>→</b></button><button><span>↥</span><div><strong>Download report</strong><small>Export your monthly attendance</small></div><b>→</b></button></div></section>
        </div>
      </section>
    </main>
  );
}

function AdminDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = workforce.filter((row) => `${row.name} ${row.id} ${row.department}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="dashboard-shell admin-dashboard"><aside className="sidebar"><div className="sidebar-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><div><strong>CPSTL</strong><span>Admin Portal</span></div></div><nav><p>WORKFORCE</p><button className="nav-active"><span>▦</span> Attendance Overview</button><button><span>◎</span> Live Attendance</button><button><span>♙</span> Employees</button><button><span>▤</span> Reports</button><p>MANAGEMENT</p><button><span>◷</span> Shifts & Rosters</button><button><span>▣</span> Fingerprint Devices</button><button><span>✓</span> Leave Management</button></nav><div className="sidebar-bottom"><button><span>⚙</span> Settings</button><button onClick={onSignOut}><span>↪</span> Sign out</button></div></aside><section className="dashboard-main"><header className="topbar"><div className="dashboard-logo-mobile"><img src="/cpstl-logo.png" alt="CPSTL" /></div><div className="status-pill"><i /> 6 fingerprint devices online</div><div className="top-actions"><button aria-label="Notifications">♢<b>3</b></button><div className="avatar">AK</div><div className="user-name"><strong>Attendance Admin</strong><span>Full workforce access</span></div></div></header><div className="dashboard-content"><div className="welcome-row"><div><p className="eyebrow">THURSDAY, 20 AUGUST 2026</p><h1>Attendance administration</h1><p>Monitor fingerprint attendance across all CPSTL employees and locations.</p></div><button className="outline-button">↥ Export full report</button></div><div className="admin-access-banner"><span>✓</span><div><strong>Administrator access</strong><p>You can view all employees, attendance records, shifts, leave, and device activity.</p></div></div><section className="metric-grid"><article><div className="metric-icon red">◎</div><div><span>Present today</span><strong>1,086 <small>employees</small></strong><p className="up">87.0% attendance rate</p></div></article><article><div className="metric-icon green">✓</div><div><span>On time</span><strong>1,012 <small>employees</small></strong><p>93.2% of check-ins</p></div></article><article><div className="metric-icon amber">◷</div><div><span>Late arrivals</span><strong>74 <small>employees</small></strong><p>6.8% of check-ins</p></div></article><article><div className="metric-icon blue">—</div><div><span>Absent today</span><strong>162 <small>employees</small></strong><p>96 on approved leave</p></div></article></section><section className="panel attendance-panel"><div className="panel-title attendance-heading"><div><h2>All employee attendance</h2><p>Live fingerprint records across the workforce</p></div><div className="attendance-tools"><input aria-label="Search employees" placeholder="Search employee..." value={query} onChange={(event) => setQuery(event.target.value)} /><button>Today⌄</button></div></div><div className="attendance-table"><div className="attendance-row table-head"><span>Employee</span><span>Department</span><span>Check in</span><span>Check out</span><span>Status</span></div>{filtered.map(row => <div className="attendance-row" key={row.id}><div className="employee-cell"><span>{row.initials}</span><div><strong>{row.name}</strong><small>{row.id}</small></div></div><span>{row.department}</span><strong>{row.checkIn}</strong><span>{row.checkOut}</span><span className={`attendance-tag ${row.status.toLowerCase().replace(" ", "-")}`}>{row.status}</span></div>)}</div><button className="view-records">View all employee records →</button></section><section className="quick-section"><div className="panel-title"><div><h2>Admin actions</h2><p>Manage workforce attendance</p></div></div><div className="quick-grid"><button><span>＋</span><div><strong>Register employee</strong><small>Enroll a new fingerprint</small></div><b>→</b></button><button><span>▤</span><div><strong>Generate report</strong><small>Export workforce attendance</small></div><b>→</b></button><button><span>◷</span><div><strong>Manage shifts</strong><small>Update rosters and schedules</small></div><b>→</b></button></div></section></div></section></main>;
}
