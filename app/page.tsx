"use client";

import { FormEvent, useState } from "react";

const attendance = [
  { initials: "NP", name: "Nimal Perera", id: "CPSTL-1042", department: "Terminal Operations", time: "07:28 AM", type: "Check in", status: "On time" },
  { initials: "SD", name: "Saman Dissanayake", id: "CPSTL-0876", department: "Engineering", time: "07:34 AM", type: "Check in", status: "On time" },
  { initials: "IF", name: "Ishara Fernando", id: "CPSTL-1218", department: "Safety & Compliance", time: "07:49 AM", type: "Check in", status: "Late" },
  { initials: "RK", name: "Ruwan Kumara", id: "CPSTL-0965", department: "Loading Bay", time: "08:02 AM", type: "Check in", status: "Late" },
  { initials: "AM", name: "Ayesha Madushani", id: "CPSTL-1107", department: "Administration", time: "12:18 PM", type: "Check out", status: "Half day" },
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = attendance.filter((row) => `${row.name} ${row.id} ${row.department}`.toLowerCase().includes(query.toLowerCase()));

  function signIn(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSignedIn(true); }

  if (!signedIn) return (
    <main className="login-shell">
      <section className="brand-panel"><div className="brand-glow" /><div className="brand-copy"><img className="login-logo" src="/cpstl-logo.png" alt="Ceylon Petroleum Storage Terminals Limited" /><p className="eyebrow light">CPSTL ATTENDANCE PORTAL</p><h1>Secure attendance,<br /><span>accurate and reliable.</span></h1><p className="brand-description">One secure workspace for fingerprint attendance, employee punctuality, and workforce insights.</p><div className="brand-stats"><div><strong>24/7</strong><span>Monitoring</span></div><div><strong>1,248</strong><span>Employees</span></div><div><strong>6</strong><span>Devices</span></div></div></div><p className="brand-footer">Ceylon Petroleum Storage Terminals Limited</p></section>
      <section className="login-panel"><div className="login-card"><div className="mobile-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><span>CPSTL</span></div><p className="eyebrow">SECURE EMPLOYEE ACCESS</p><h2>Welcome back</h2><p className="login-intro">Sign in to view the fingerprint attendance dashboard.</p><form onSubmit={signIn}><label htmlFor="employee-id">Employee ID</label><div className="input-wrap"><span>●</span><input id="employee-id" placeholder="e.g. CPSTL-1042" required /></div><div className="password-label"><label htmlFor="password">Password</label><button type="button">Forgot password?</button></div><div className="input-wrap"><span>◆</span><input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required /><button className="show-password" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div><label className="remember"><input type="checkbox" /><span>Keep me signed in on this device</span></label><button className="primary-button" type="submit">Sign in to portal <span>→</span></button></form><div className="secure-note"><span>✓</span><p><strong>Protected access</strong><br />Your session is encrypted and monitored.</p></div><p className="support">Having trouble? <a href="mailto:ithelpdesk@cpstl.lk">Contact IT Helpdesk</a></p></div></section>
    </main>
  );

  return (
    <main className="dashboard-shell">
      <aside className="sidebar"><div className="sidebar-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><div><strong>CPSTL</strong><span>Attendance Portal</span></div></div><nav aria-label="Main navigation"><p>ATTENDANCE</p><button className="nav-active"><span>▦</span> Overview</button><button><span>◎</span> Live Attendance</button><button><span>♙</span> Employees</button><button><span>▤</span> Attendance Reports</button><p>MANAGEMENT</p><button><span>◷</span> Shifts & Rosters</button><button><span>▣</span> Fingerprint Devices</button><button><span>✓</span> Leave Management</button></nav><div className="sidebar-bottom"><button><span>⚙</span> Settings</button><button onClick={() => setSignedIn(false)}><span>↪</span> Sign out</button></div></aside>
      <section className="dashboard-main">
        <header className="topbar"><div className="dashboard-logo-mobile"><img src="/cpstl-logo.png" alt="CPSTL" /></div><div className="status-pill"><i /> 6 fingerprint devices online</div><div className="top-actions"><button aria-label="Notifications">♢<b>3</b></button><div className="avatar">AK</div><div className="user-name"><strong>Amal Kumara</strong><span>HR Administrator</span></div></div></header>
        <div className="dashboard-content">
          <div className="welcome-row"><div><p className="eyebrow">THURSDAY, 20 AUGUST 2026</p><h1>Fingerprint attendance</h1><p>Live attendance summary for all CPSTL locations.</p></div><button className="outline-button">↥ Export attendance</button></div>
          <section className="metric-grid attendance-metrics"><article><div className="metric-icon red">◎</div><div><span>Present today</span><strong>1,086 <small>employees</small></strong><p className="up">87.0% attendance rate</p></div></article><article><div className="metric-icon green">✓</div><div><span>On time</span><strong>1,012 <small>employees</small></strong><p>93.2% of check-ins</p></div></article><article><div className="metric-icon amber">◷</div><div><span>Late arrivals</span><strong>74 <small>employees</small></strong><p>6.8% of check-ins</p></div></article><article><div className="metric-icon blue">—</div><div><span>Absent today</span><strong>162 <small>employees</small></strong><p>Includes approved leave</p></div></article></section>
          <section className="attendance-summary panel"><div className="panel-title"><div><h2>Today&apos;s attendance overview</h2><p>Workforce status across all departments</p></div><span className="live"><i /> LIVE</span></div><div className="summary-body"><div className="attendance-ring"><div><strong>87%</strong><span>Present</span></div></div><div className="summary-bars"><div><span><b>Present</b><small>1,086 employees</small></span><div><i style={{width:"87%"}} /></div><strong>87%</strong></div><div><span><b>On approved leave</b><small>96 employees</small></span><div><i className="leave" style={{width:"8%"}} /></div><strong>8%</strong></div><div><span><b>Unaccounted</b><small>66 employees</small></span><div><i className="absent" style={{width:"5%"}} /></div><strong>5%</strong></div></div><div className="device-card"><span className="fingerprint">◎</span><div><strong>6 / 6 Devices</strong><small>All fingerprint scanners online</small><p>Last sync: just now</p></div></div></div></section>
          <section className="panel attendance-panel"><div className="panel-title attendance-heading"><div><h2>Recent fingerprint records</h2><p>Latest employee check-in and check-out activity</p></div><div className="attendance-tools"><input aria-label="Search attendance records" placeholder="Search employee..." value={query} onChange={(event) => setQuery(event.target.value)} /><button>Today⌄</button></div></div><div className="attendance-table"><div className="attendance-row table-head"><span>Employee</span><span>Department</span><span>Time</span><span>Record</span><span>Status</span></div>{filtered.map((row) => <div className="attendance-row" key={`${row.id}-${row.type}`}><div className="employee-cell"><span>{row.initials}</span><div><strong>{row.name}</strong><small>{row.id}</small></div></div><span>{row.department}</span><strong>{row.time}</strong><span>{row.type}</span><span className={`attendance-tag ${row.status.toLowerCase().replace(" ", "-")}`}>{row.status}</span></div>)}</div><button className="view-records">View all attendance records →</button></section>
          <section className="quick-section"><div className="panel-title"><div><h2>Quick actions</h2><p>Common attendance management tasks</p></div></div><div className="quick-grid"><button><span>＋</span><div><strong>Register fingerprint</strong><small>Enroll a new employee</small></div><b>→</b></button><button><span>▤</span><div><strong>Monthly report</strong><small>Generate attendance summary</small></div><b>→</b></button><button><span>◷</span><div><strong>Manage shifts</strong><small>Update employee rosters</small></div><b>→</b></button></div></section>
        </div>
      </section>
    </main>
  );
}
