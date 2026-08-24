"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type UnknownFingerprint = { logTime: string | null; deviceSerial: string | null; imageName: string | null; capturedImage: string };
type EmployeeAttendance = {
  logTime: string; employeePIN: string; employeeEPF: string | null; name: string | null;
  verifyMode: string | null; deviceSerial: string | null; deviceIP: string | null;
  deviceLocation: string | null; deviceLabel: string | null; mobileNumber: string | null;
  email: string | null; employeeLocation: string | null; employeeBranch: string | null;
  position: string | null; imageName: string | null; capturedImage: string | null;
};

const now = new Date();
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const defaultEnd = dateValue(now);
const defaultStart = `${defaultEnd.slice(0, 7)}-01`;
const displayTime = (value: string | null) => value
  ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(value))
  : "Time not recorded";

export default function AdminUnknownFingerprints({ apiUrl, onSignOut }: { apiUrl: string; onSignOut: () => void }) {
  const [view, setView] = useState<"attendance" | "unknown">("attendance");
  const [unknownRecords, setUnknownRecords] = useState<UnknownFingerprint[]>([]);
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>([]);
  const [selectedUnknown, setSelectedUnknown] = useState<UnknownFingerprint | null>(null);
  const [selectedAttendance, setSelectedAttendance] = useState<EmployeeAttendance | null>(null);
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [unknownDate, setUnknownDate] = useState(defaultEnd);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAttendance = useCallback(async (requestedPage = 1) => {
    setLoading(true); setError("");
    try {
      const parameters = new URLSearchParams({ startDate, endDate, search: search.trim(), page: String(requestedPage) });
      const response = await fetch(`${apiUrl}/api/admin/attendance?${parameters}`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load employee attendance.");
      setAttendance(result.records || []); setTotal(result.total || 0); setPage(result.page || 1);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load employee attendance."); }
    finally { setLoading(false); }
  }, [apiUrl, endDate, search, startDate]);

  const loadUnknown = useCallback(async (requestedDate = unknownDate) => {
    setLoading(true); setError("");
    try {
      const parameters = new URLSearchParams({ startDate: requestedDate, endDate: requestedDate });
      const response = await fetch(`${apiUrl}/api/admin/unknown-fingerprints?${parameters}`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load unknown fingerprint images.");
      setUnknownRecords(result.records || []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load unknown fingerprint images."); }
    finally { setLoading(false); }
  }, [apiUrl, unknownDate]);

  useEffect(() => { const timer = window.setTimeout(() => loadAttendance(1), 0); return () => window.clearTimeout(timer); }, [loadAttendance]);
  useEffect(() => {
    const refreshActiveView = () => {
      if (document.visibilityState !== "visible") return;
      if (view === "attendance") loadAttendance(page);
      else loadUnknown();
    };
    const interval = window.setInterval(refreshActiveView, 30000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshActiveView();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadAttendance, loadUnknown, page, view]);
  const switchView = (next: "attendance" | "unknown") => { setView(next); if (next === "unknown") loadUnknown(); else loadAttendance(1); };
  const searchAttendance = (event: FormEvent) => { event.preventDefault(); loadAttendance(1); };

  return <main className="dashboard-shell admin-dashboard unknown-admin">
    <aside className="sidebar"><div className="sidebar-brand"><img src="/cpstl-logo.png" alt="CPSTL" /><div><strong>CPSTL</strong><span>Admin Portal</span></div></div><nav><p>ATTENDANCE</p><button className={view === "attendance" ? "nav-active" : ""} onClick={() => switchView("attendance")}><span>▦</span> All employee records</button><button className={view === "unknown" ? "nav-active" : ""} onClick={() => switchView("unknown")}><span>◎</span> Unknown fingerprints</button></nav><div className="sidebar-bottom"><button onClick={onSignOut}><span>↪</span> Sign out</button></div></aside>
    <section className="dashboard-main"><header className="topbar"><div className="dashboard-logo-mobile"><img src="/cpstl-logo.png" alt="CPSTL" /></div><div className="status-pill"><i /> Administrator access only</div><div className="top-actions"><div className="avatar">AD</div><div className="user-name"><strong>Attendance Admin</strong><span>Full attendance access</span></div></div></header><div className="dashboard-content">
      <div className="welcome-row"><div><p className="eyebrow">ADMINISTRATION</p><h1>{view === "attendance" ? "All employee attendance" : "Unknown fingerprints"}</h1><p>{view === "attendance" ? "Search and review fingerprint records for every employee." : "Images where the device could not identify an employee."}</p></div><button className="outline-button" onClick={() => view === "attendance" ? loadAttendance(page) : loadUnknown()} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button></div>
      <div className="admin-access-banner"><span>{view === "attendance" ? "✓" : "!"}</span><div><strong>Restricted administrator data</strong><p>Employee accounts cannot access these organization-wide records.</p></div></div>
      {error && <p className="login-error" role="alert">{error}</p>}
      {view === "attendance" ? <>
        <form className="admin-filters panel" onSubmit={searchAttendance}><label>Employee search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, EPF or PIN" /></label><label>From<input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>To<input type="date" value={endDate} min={startDate} max={defaultEnd} onChange={(event) => setEndDate(event.target.value)} /></label><button type="submit">Search</button></form>
        <section className="panel attendance-panel"><div className="panel-title"><div><h2>Employee records</h2><p>{total} records found · page {page} of {Math.max(1, Math.ceil(total / 100))}</p></div></div><div className="admin-record-table"><div className="admin-record-row table-head"><span>Employee</span><span>Date and time</span><span>Verification</span><span>Device</span><span>Location</span></div>{attendance.map((record, index) => <button className="admin-record-row" key={`${record.employeePIN}-${record.logTime}-${index}`} onClick={() => setSelectedAttendance(record)}><span><strong>{record.name || `Employee ${record.employeePIN}`}</strong><small>EPF {record.employeeEPF || "—"} · PIN {record.employeePIN}</small></span><span>{displayTime(record.logTime)}</span><span>{record.verifyMode || "Fingerprint"}</span><span>{record.deviceLabel || record.deviceSerial || "—"}</span><span>{record.deviceLocation || record.employeeLocation || "—"}</span></button>)}</div>{!loading && attendance.length === 0 && <p className="empty-attendance">No employee records found.</p>}<div className="admin-pagination"><button disabled={page <= 1 || loading} onClick={() => loadAttendance(page - 1)}>Previous</button><button disabled={page * 100 >= total || loading} onClick={() => loadAttendance(page + 1)}>Next</button></div></section>
      </> : <><form className="admin-filters panel" style={{ gridTemplateColumns: "180px 100px" }} onSubmit={(event) => { event.preventDefault(); loadUnknown(); }}><label>Selected date<input type="date" value={unknownDate} max={defaultEnd} onChange={(event) => setUnknownDate(event.target.value)} /></label><button type="submit">Show</button></form><section className="unknown-grid" aria-live="polite">{unknownRecords.map((record, index) => <button className="unknown-card" key={`${record.imageName}-${index}`} onClick={() => setSelectedUnknown(record)}><img src={record.capturedImage} alt="Unknown person captured by fingerprint device" /><span><strong>{displayTime(record.logTime)}</strong><small>{record.imageName || "Unnamed captured image"}</small><small>Device {record.deviceSerial || "not recorded"}</small></span></button>)}</section>{!loading && unknownRecords.length === 0 && <section className="panel empty-attendance">No unknown fingerprint images were found for the selected day.</section>}</>}
    </div></section>
    {selectedAttendance && <div className="attendance-modal-backdrop"><section className="attendance-modal admin-detail-modal" role="dialog" aria-modal="true" aria-labelledby="employee-record-title"><header><div><p className="eyebrow">EMPLOYEE ATTENDANCE</p><h2 id="employee-record-title">{selectedAttendance.name || `Employee ${selectedAttendance.employeePIN}`}</h2></div><button aria-label="Close" onClick={() => setSelectedAttendance(null)}>×</button></header><div className="attendance-modal-body"><div className="attendance-modal-image">{selectedAttendance.capturedImage ? <img src={selectedAttendance.capturedImage} alt="Employee captured at fingerprint device" /> : <div className="capture-placeholder">No captured image</div>}</div><dl><div><dt>EPF / PIN</dt><dd>{selectedAttendance.employeeEPF || "—"} / {selectedAttendance.employeePIN}</dd></div><div><dt>Date and time</dt><dd>{displayTime(selectedAttendance.logTime)}</dd></div><div><dt>Verification</dt><dd>{selectedAttendance.verifyMode || "Fingerprint"}</dd></div><div><dt>Device</dt><dd>{selectedAttendance.deviceLabel || selectedAttendance.deviceSerial || "Not recorded"}</dd></div><div><dt>Location</dt><dd>{selectedAttendance.deviceLocation || selectedAttendance.employeeLocation || "Not recorded"}</dd></div><div><dt>Branch / position</dt><dd>{selectedAttendance.employeeBranch || "—"} / {selectedAttendance.position || "—"}</dd></div><div><dt>Contact</dt><dd>{selectedAttendance.mobileNumber || selectedAttendance.email || "Not recorded"}</dd></div><div><dt>IP address</dt><dd>{selectedAttendance.deviceIP || "Not recorded"}</dd></div></dl></div><footer><button onClick={() => setSelectedAttendance(null)}>Close</button></footer></section></div>}
    {selectedUnknown && <div className="attendance-modal-backdrop"><section className="attendance-modal" role="dialog" aria-modal="true" aria-labelledby="unknown-title"><header><div><p className="eyebrow">UNKNOWN FINGERPRINT</p><h2 id="unknown-title">Captured image</h2></div><button aria-label="Close" onClick={() => setSelectedUnknown(null)}>×</button></header><div className="attendance-modal-body"><div className="attendance-modal-image"><img src={selectedUnknown.capturedImage} alt="Unknown person captured by fingerprint device" /></div><dl><div><dt>Date and time</dt><dd>{displayTime(selectedUnknown.logTime)}</dd></div><div><dt>Image name</dt><dd>{selectedUnknown.imageName || "Not recorded"}</dd></div><div><dt>Device serial</dt><dd>{selectedUnknown.deviceSerial || "Not recorded"}</dd></div><div><dt>Identification</dt><dd>Unknown</dd></div></dl></div><footer><button onClick={() => setSelectedUnknown(null)}>Close</button></footer></section></div>}
  </main>;
}
