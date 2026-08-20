"use client";

import { FormEvent, useState } from "react";

const logs = [
  { date: "20 Aug 2026", day: "Today", checkIn: "07:28 AM", checkOut: "—", hours: "In progress", status: "Present" },
  { date: "19 Aug 2026", day: "Wednesday", checkIn: "07:31 AM", checkOut: "04:42 PM", hours: "9h 11m", status: "Present" },
  { date: "18 Aug 2026", day: "Tuesday", checkIn: "07:46 AM", checkOut: "04:38 PM", hours: "8h 52m", status: "Late" },
  { date: "17 Aug 2026", day: "Monday", checkIn: "07:26 AM", checkOut: "04:35 PM", hours: "9h 09m", status: "Present" },
  { date: "14 Aug 2026", day: "Friday", checkIn: "07:29 AM", checkOut: "04:31 PM", hours: "9h 02m", status: "Present" },
];

const calendar = [
  ...Array(5).fill(null),
  ...Array.from({ length: 20 }, (_, index) => ({ day: index + 1, state: [4, 11].includes(index + 1) ? "late" : [7, 8, 14, 15].includes(index + 1) ? "weekend" : index + 1 === 12 ? "leave" : "present" })),
  ...Array(10).fill(null),
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [employeeId, setEmployeeId] = useState("CPSTL-1042");

  function signIn(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSignedIn(true); }

  if (!signedIn) return (
    <main className="login-shell">
      <section className="brand-panel"><div className="brand-glow" /><div className="brand-copy"><img className="login-logo" src="/cpstl-logo.png" alt="Ceylon Petroleum Storage Terminals Limited" /><p className="eyebrow light">CPSTL EMPLOYEE PORTAL</p><h1>Your attendance,<br /><span>clear and accessible.</span></h1><p className="brand-description">Securely review your fingerprint records, working hours, punctuality, and leave information.</p><div className="brand-stats"><div><strong>24/7</strong><span>Access</span></div><div><strong>Live</strong><span>Records</span></div><div><strong>Secure</strong><span>Account</span></div></div></div><p className="brand-footer">Ceylon Petroleum Storage Terminals Limited</p></section>
      <section className="login-panel"><div className="login-card"><div className="mobile-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><span>CPSTL</span></div><p className="eyebrow">EMPLOYEE SELF-SERVICE</p><h2>Welcome back</h2><p className="login-intro">Use your employee username and password to view your attendance.</p><form onSubmit={signIn}><label htmlFor="employee-id">Employee username</label><div className="input-wrap"><span>●</span><input id="employee-id" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} placeholder="e.g. CPSTL-1042" required /></div><div className="password-label"><label htmlFor="password">Password</label><button type="button">Forgot password?</button></div><div className="input-wrap"><span>◆</span><input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required /><button className="show-password" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div><label className="remember"><input type="checkbox" /><span>Keep me signed in on this device</span></label><button className="primary-button" type="submit">View my attendance <span>→</span></button></form><div className="demo-note"><strong>Demo access</strong><span>Username: CPSTL-1042 · Password: any non-empty value</span></div><p className="support">Having trouble? <a href="mailto:ithelpdesk@cpstl.lk">Contact IT Helpdesk</a></p></div></section>
    </main>
  );

  return (
    <main className="dashboard-shell employee-dashboard">
      <aside className="sidebar"><div className="sidebar-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><div><strong>CPSTL</strong><span>Employee Portal</span></div></div><nav><p>MY WORKSPACE</p><button className="nav-active"><span>▦</span> My Attendance</button><button><span>◷</span> Attendance History</button><button><span>▤</span> My Leave</button><button><span>♙</span> My Profile</button><p>SUPPORT</p><button><span>?</span> Request Correction</button><button><span>☏</span> Help & Support</button></nav><div className="sidebar-bottom"><button><span>⚙</span> Settings</button><button onClick={() => setSignedIn(false)}><span>↪</span> Sign out</button></div></aside>
      <section className="dashboard-main"><header className="topbar"><div className="dashboard-logo-mobile"><img src="/cpstl-logo.png" alt="CPSTL" /></div><div className="status-pill"><i /> Fingerprint verified today</div><div className="top-actions"><button aria-label="Notifications">♢<b>1</b></button><div className="avatar">NP</div><div className="user-name"><strong>Nimal Perera</strong><span>{employeeId}</span></div></div></header>
        <div className="dashboard-content"><div className="welcome-row"><div><p className="eyebrow">THURSDAY, 20 AUGUST 2026</p><h1>Good morning, Nimal.</h1><p>Here is your personal fingerprint attendance summary.</p></div><button className="outline-button">↥ Download my report</button></div>
          <section className="employee-profile-strip"><div className="profile-avatar">NP</div><div><strong>Nimal Perera</strong><span>{employeeId} · Terminal Operations</span></div><dl><div><dt>Shift</dt><dd>07:30 AM – 04:30 PM</dd></div><div><dt>Location</dt><dd>Kolonnawa Terminal</dd></div><div><dt>Supervisor</dt><dd>Amal Kumara</dd></div></dl></section>
          <section className="metric-grid attendance-metrics"><article><div className="metric-icon red">✓</div><div><span>Days present</span><strong>18 <small>of 19 days</small></strong><p className="up">94.7% attendance</p></div></article><article><div className="metric-icon green">◷</div><div><span>Hours worked</span><strong>162h <small>this month</small></strong><p>Average 9h per day</p></div></article><article><div className="metric-icon amber">!</div><div><span>Late arrivals</span><strong>2 <small>this month</small></strong><p>18 minutes total</p></div></article><article><div className="metric-icon blue">▤</div><div><span>Leave balance</span><strong>12 <small>days remaining</small></strong><p>1 approved day in August</p></div></article></section>
          <div className="employee-grid"><section className="panel today-card"><div className="panel-title"><div><h2>Today&apos;s attendance</h2><p>Your live fingerprint status</p></div><span className="attendance-tag">Present</span></div><div className="today-timeline"><div className="timeline-event done"><span>◎</span><div><small>CHECK IN</small><strong>07:28 AM</strong><p>Fingerprint Device 01 · Main Gate</p></div></div><i /><div className="timeline-event"><span>◷</span><div><small>CHECK OUT</small><strong>Pending</strong><p>Expected after 04:30 PM</p></div></div></div><div className="worked-progress"><span><b>Time worked today</b><strong>4h 52m / 9h</strong></span><div><i style={{width:"54%"}} /></div></div></section>
            <section className="panel calendar-card"><div className="panel-title"><div><h2>August 2026</h2><p>Your monthly attendance</p></div><button>‹ &nbsp; ›</button></div><div className="calendar-head">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendar.map((item, index) => <div key={index} className={item ? item.state : "empty"}>{item?.day}</div>)}</div><div className="calendar-legend"><span><i className="present" /> Present</span><span><i className="late" /> Late</span><span><i className="leave" /> Leave</span></div></section></div>
          <section className="panel attendance-panel"><div className="panel-title attendance-heading"><div><h2>My recent attendance</h2><p>Your latest fingerprint check-in and check-out records</p></div><button>View full history →</button></div><div className="self-table"><div className="self-row table-head"><span>Date</span><span>Check in</span><span>Check out</span><span>Working hours</span><span>Status</span></div>{logs.map(row => <div className="self-row" key={row.date}><div><strong>{row.date}</strong><small>{row.day}</small></div><strong>{row.checkIn}</strong><strong>{row.checkOut}</strong><span>{row.hours}</span><span className={`attendance-tag ${row.status.toLowerCase()}`}>{row.status}</span></div>)}</div></section>
          <section className="quick-section"><div className="panel-title"><div><h2>Employee services</h2><p>Manage your attendance and leave</p></div></div><div className="quick-grid"><button><span>?</span><div><strong>Request correction</strong><small>Report a missing fingerprint record</small></div><b>→</b></button><button><span>▤</span><div><strong>Apply for leave</strong><small>Submit a new leave request</small></div><b>→</b></button><button><span>↥</span><div><strong>Download report</strong><small>Export your monthly attendance</small></div><b>→</b></button></div></section>
        </div>
      </section>
    </main>
  );
}
