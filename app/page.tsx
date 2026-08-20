"use client";

import { FormEvent, useState } from "react";

const tanks = [
  { name: "Tank A-01", product: "Auto Diesel", capacity: "82%", volume: "8.2M L", status: "Normal" },
  { name: "Tank A-02", product: "Petrol 92", capacity: "67%", volume: "5.4M L", status: "Normal" },
  { name: "Tank B-04", product: "Jet A-1", capacity: "91%", volume: "7.8M L", status: "High" },
  { name: "Tank C-02", product: "Kerosene", capacity: "48%", volume: "3.1M L", status: "Normal" },
];

const activities = [
  { icon: "↓", title: "MT Ocean Pride — Discharge", meta: "Jetty 02 · 2 minutes ago", tone: "blue" },
  { icon: "✓", title: "Tank A-02 inspection completed", meta: "Safety team · 24 minutes ago", tone: "green" },
  { icon: "↑", title: "Bowser 07 — Loading", meta: "Loading bay 03 · 42 minutes ago", tone: "red" },
];

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignedIn(true);
  }

  if (!signedIn) {
    return (
      <main className="login-shell">
        <section className="brand-panel">
          <div className="brand-glow" />
          <div className="brand-copy">
            <img className="login-logo" src="/cpstl-logo.png" alt="Ceylon Petroleum Storage Terminals Limited" />
            <p className="eyebrow light">CPSTL OPERATIONS PORTAL</p>
            <h1>Powering the nation,<br /><span>safely and reliably.</span></h1>
            <p className="brand-description">Secure access to terminal operations, inventory intelligence, and real-time performance.</p>
            <div className="brand-stats"><div><strong>24/7</strong><span>Operations</span></div><div><strong>99.9%</strong><span>Uptime</span></div><div><strong>100%</strong><span>Commitment</span></div></div>
          </div>
          <p className="brand-footer">Ceylon Petroleum Storage Terminals Limited</p>
        </section>
        <section className="login-panel">
          <div className="login-card">
            <div className="mobile-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><span>CPSTL</span></div>
            <p className="eyebrow">SECURE EMPLOYEE ACCESS</p><h2>Welcome back</h2><p className="login-intro">Sign in to continue to your operations workspace.</p>
            <form onSubmit={signIn}>
              <label htmlFor="employee-id">Employee ID</label><div className="input-wrap"><span>●</span><input id="employee-id" placeholder="e.g. CPSTL-1042" required /></div>
              <div className="password-label"><label htmlFor="password">Password</label><button type="button">Forgot password?</button></div>
              <div className="input-wrap"><span>◆</span><input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required /><button className="show-password" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div>
              <label className="remember"><input type="checkbox" /> <span>Keep me signed in on this device</span></label>
              <button className="primary-button" type="submit">Sign in to portal <span>→</span></button>
            </form>
            <div className="secure-note"><span>✓</span><p><strong>Protected access</strong><br />Your session is encrypted and monitored.</p></div>
            <p className="support">Having trouble? <a href="mailto:ithelpdesk@cpstl.lk">Contact IT Helpdesk</a></p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><div><strong>CPSTL</strong><span>Operations Portal</span></div></div>
        <nav aria-label="Main navigation"><p>WORKSPACE</p><button className="nav-active"><span>▦</span> Overview</button><button><span>◫</span> Tank Inventory</button><button><span>⇄</span> Movements</button><button><span>▤</span> Reports</button><p>OPERATIONS</p><button><span>⚓</span> Jetty Operations</button><button><span>▣</span> Loading Bays</button><button><span>♢</span> Safety & Compliance</button></nav>
        <div className="sidebar-bottom"><button><span>⚙</span> Settings</button><button onClick={() => setSignedIn(false)}><span>↪</span> Sign out</button></div>
      </aside>
      <section className="dashboard-main">
        <header className="topbar"><div className="dashboard-logo-mobile"><img src="/cpstl-logo.png" alt="CPSTL" /></div><div className="status-pill"><i /> All systems operational</div><div className="top-actions"><button aria-label="Notifications">♢<b>3</b></button><div className="avatar">AK</div><div className="user-name"><strong>Amal Kumara</strong><span>Operations Manager</span></div></div></header>
        <div className="dashboard-content">
          <div className="welcome-row"><div><p className="eyebrow">THURSDAY, 20 AUGUST 2026</p><h1>Good morning, Amal.</h1><p>Here&apos;s what&apos;s happening across the terminal today.</p></div><button className="outline-button">↥ Export report</button></div>
          <section className="metric-grid"><article><div className="metric-icon blue">◫</div><div><span>Total inventory</span><strong>24.5M <small>litres</small></strong><p className="up">↗ 2.4% from yesterday</p></div></article><article><div className="metric-icon red">⇄</div><div><span>Today&apos;s movement</span><strong>1.84M <small>litres</small></strong><p>14 transfers completed</p></div></article><article><div className="metric-icon green">✓</div><div><span>Active tanks</span><strong>18 <small>of 22</small></strong><p>4 tanks in maintenance</p></div></article><article><div className="metric-icon amber">⚠</div><div><span>Safety status</span><strong>0 <small>incidents</small></strong><p>286 days incident-free</p></div></article></section>
          <div className="dashboard-grid"><section className="panel inventory-panel"><div className="panel-title"><div><h2>Tank inventory</h2><p>Current storage levels by tank</p></div><button>View all tanks →</button></div><div className="tank-list">{tanks.map((tank) => <div className="tank-row" key={tank.name}><div className="tank-name"><span>◉</span><div><strong>{tank.name}</strong><small>{tank.product}</small></div></div><div className="bar"><i style={{ width: tank.capacity }} /></div><strong className="capacity">{tank.capacity}</strong><span className="volume">{tank.volume}</span><span className={`tag ${tank.status === "High" ? "high" : ""}`}>{tank.status}</span></div>)}</div></section>
            <section className="panel activity-panel"><div className="panel-title"><div><h2>Live activity</h2><p>Latest terminal movements</p></div><span className="live"><i /> LIVE</span></div><div className="activity-list">{activities.map((item) => <div className="activity" key={item.title}><div className={`activity-icon ${item.tone}`}>{item.icon}</div><div><strong>{item.title}</strong><span>{item.meta}</span></div></div>)}</div><button className="activity-button">View activity log</button></section></div>
          <section className="quick-section"><div className="panel-title"><div><h2>Quick actions</h2><p>Common operational tasks</p></div></div><div className="quick-grid"><button><span>＋</span><div><strong>Record movement</strong><small>Log a new fuel transfer</small></div><b>→</b></button><button><span>▤</span><div><strong>Generate report</strong><small>Create inventory summary</small></div><b>→</b></button><button><span>✓</span><div><strong>Safety checklist</strong><small>Start daily inspection</small></div><b>→</b></button></div></section>
        </div>
      </section>
    </main>
  );
}
