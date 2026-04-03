import { useState, useEffect, useCallback } from "react";

/* ─── SUPABASE ───────────────────────────────────────────────────────── */
const SUPA_URL = "https://ywrbatklgymaziosucuo.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cmJhdGtsZ3ltYXppb3N1Y3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzk4NzAsImV4cCI6MjA5MDgxNTg3MH0.euAYuj4cTvd3M3mgQSKQPnlarLZvZssjpnhki79mdpM";
const H = { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY };

async function sbFetch(path, opts={}) {
  const res = await fetch(SUPA_URL + "/rest/v1/" + path, { ...opts, headers: { ...H, ...opts.headers } });
  if (!res.ok) { const e = await res.text(); console.error("Supabase error:", e); return null; }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Dipendenti
async function dbLoadEmployees() {
  const data = await sbFetch("dipendenti?select=*&order=name");
  if (!data) return null;
  return data.map(r => ({ id: r.id, name: r.name, role: r.role||"", dept: r.dept||"", pin: r.pin, email: r.email||"", phone: r.phone||"", avatar: r.avatar||"👤", target: r.target||8, color: r.color||"#2563eb" }));
}
async function dbInsertEmployee(emp) {
  return sbFetch("dipendenti", { method:"POST", headers:{"Prefer":"return=representation"}, body: JSON.stringify({ id:emp.id, name:emp.name, role:emp.role, dept:emp.dept, pin:emp.pin, email:emp.email, phone:emp.phone, avatar:emp.avatar, target:emp.target, color:emp.color }) });
}
async function dbUpdateEmployee(emp) {
  return sbFetch(`dipendenti?id=eq.${emp.id}`, { method:"PATCH", headers:{"Prefer":"return=representation"}, body: JSON.stringify({ name:emp.name, role:emp.role, dept:emp.dept, pin:emp.pin, email:emp.email, phone:emp.phone, avatar:emp.avatar, target:emp.target, color:emp.color }) });
}
async function dbDeleteEmployee(id) {
  return sbFetch(`dipendenti?id=eq.${id}`, { method:"DELETE" });
}

// ── Timbrature
async function dbLoadRecords() {
  const data = await sbFetch("timbrature?select=*&order=time.desc&limit=2000");
  if (!data) return null;
  return data.map(r => ({ id: r.id, empId: r.emp_id, type: r.type, time: new Date(r.time), location: r.location||"Sede principale" }));
}
async function dbInsertRecord(rec) {
  return sbFetch("timbrature", { method:"POST", body: JSON.stringify({ id: String(rec.id), emp_id: rec.empId, type: rec.type, time: rec.time.toISOString(), location: rec.location }) });
}
async function dbDeleteRecord(id) {
  return sbFetch(`timbrature?id=eq.${id}`, { method:"DELETE" });
}

/* ─── GOOGLE FONTS ───────────────────────────────────────────────────── */
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`;

/* ─── INITIAL DATA ───────────────────────────────────────────────────── */
const ADMIN_PIN = "0886";

const INIT_EMPLOYEES = [
  { id: 1, name: "Marco Rossi",    role: "Sviluppatore Senior", dept: "IT",            pin: "1234", email: "m.rossi@azienda.it",   phone: "333 1234567", avatar: "👨‍💻", target: 8, color: "#2563eb" },
  { id: 2, name: "Laura Bianchi",  role: "Project Manager",     dept: "Gestione",      pin: "2345", email: "l.bianchi@azienda.it",  phone: "334 2345678", avatar: "👩‍💼", target: 8, color: "#2563eb" },
  { id: 3, name: "Antonio Greco",  role: "Designer UX",         dept: "Design",        pin: "3456", email: "a.greco@azienda.it",    phone: "335 3456789", avatar: "🎨",  target: 7, color: "#2563eb" },
  { id: 4, name: "Sofia Ferrari",  role: "Analista Dati",       dept: "IT",            pin: "4567", email: "s.ferrari@azienda.it",  phone: "336 4567890", avatar: "📊",  target: 8, color: "#2563eb" },
  { id: 5, name: "Luca Esposito",  role: "Commerciale",         dept: "Vendite",       pin: "5678", email: "l.esposito@azienda.it", phone: "337 5678901", avatar: "💼",  target: 9, color: "#2563eb" },
  { id: 6, name: "Giulia Romano",  role: "HR Specialist",       dept: "Risorse Umane", pin: "6789", email: "g.romano@azienda.it",   phone: "338 6789012", avatar: "👩‍🏫", target: 8, color: "#2563eb" },
];

function genHistory(employees) {
  const recs = [];
  const today = new Date();
  employees.forEach(emp => {
    for (let d = 13; d >= 0; d--) {
      const date = new Date(today); date.setDate(today.getDate() - d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      if (d === 0 && Math.random() < 0.15) continue;
      const inH = 8 + Math.floor(Math.random() * 2);
      const inM = Math.floor(Math.random() * 50);
      const inT = new Date(date); inT.setHours(inH, inM, 0, 0);
      recs.push({ id: `${emp.id}-${d}-in`, empId: emp.id, type: "in", time: inT, location: "Sede principale" });
      if (d > 0 || Math.random() < 0.35) {
        const wH = emp.target - 1 + Math.random() * 2;
        const outT = new Date(inT); outT.setTime(inT.getTime() + wH * 3600000);
        recs.push({ id: `${emp.id}-${d}-out`, empId: emp.id, type: "out", time: outT, location: "Sede principale" });
      }
    }
  });
  return recs.sort((a, b) => b.time - a.time);
}

/* ─── UTILS ──────────────────────────────────────────────────────────── */
const fmtT  = d => d.toLocaleTimeString("it-IT",  { hour: "2-digit", minute: "2-digit" });
const fmtD  = d => d.toLocaleDateString("it-IT",  { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDshort = d => d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

function calcHours(recs, empId) {
  const r = recs.filter(x => x.empId === empId).sort((a,b) => a.time - b.time);
  let tot = 0, last = null;
  r.forEach(x => { if (x.type==="in") last=x.time; else if (x.type==="out"&&last){tot+=(x.time-last)/3600000; last=null;} });
  return Math.round(tot * 10) / 10;
}

function isCheckedIn(recs, empId) {
  const t = recs.filter(r => r.empId===empId && r.time>=today0()).sort((a,b)=>b.time-a.time);
  return t.length > 0 && t[0].type === "in";
}

function exportCSV(recs, employees, empFilter, from, to) {
  let rows = [...recs];
  if (empFilter !== "all") rows = rows.filter(r => r.empId === Number(empFilter));
  if (from) { const f = new Date(from); f.setHours(0,0,0,0); rows = rows.filter(r => r.time >= f); }
  if (to)   { const t = new Date(to);   t.setHours(23,59,59,999); rows = rows.filter(r => r.time <= t); }
  rows.sort((a,b) => a.time - b.time);
  const header = "Data,Ora,Dipendente,Reparto,Tipo,Sede";
  const lines = rows.map(r => {
    const e = employees.find(x => x.id === r.empId);
    return `${fmtD(r.time)},${fmtT(r.time)},"${e?.name||""}","${e?.dept||""}",${r.type==="in"?"Entrata":"Uscita"},"${r.location}"`;
  });
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="timbrature.csv"; a.click();
  URL.revokeObjectURL(url);
}

/* ─── CSS ────────────────────────────────────────────────────────────── */
const css = `
${FONT_IMPORT}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: #f0f2f5; font-family: 'Inter', sans-serif; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }

/* ── LAYOUT ── */
.app { min-height: 100vh; background: #f0f2f5; font-family: 'Inter', sans-serif; color: #111827; }
.card { background: #fff; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04); }
.page { max-width: 720px; margin: 0 auto; padding: 16px; }

/* ── LOGIN ── */
.login-outer { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #f0f2f5; }
.login-card { background: #fff; border-radius: 20px; box-shadow: 0 2px 16px rgba(0,0,0,.10); padding: 32px 24px; width: 100%; max-width: 340px; }
.login-brand { text-align: center; margin-bottom: 28px; }
.login-brand-name { font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
.login-brand-sub  { font-size: 13px; color: #6b7280; margin-top: 2px; }
.login-brand-bar  { height: 4px; border-radius: 2px; background: linear-gradient(90deg,#2563eb,#60a5fa); margin: 10px auto 0; width: 60px; }

.seg { display: flex; background: #f3f4f6; border-radius: 10px; padding: 3px; margin-bottom: 20px; }
.seg-btn { flex: 1; padding: 9px; border: none; border-radius: 8px; font-family: 'Inter',sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .15s; background: transparent; color: #6b7280; }
.seg-btn.active { background: #2563eb; color: #fff; box-shadow: 0 1px 4px rgba(37,99,235,.3); }

.select-user { width: 100%; padding: 11px 13px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: #fff; font-family: 'Inter',sans-serif; font-size: 14px; font-weight: 500; color: #111827; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' viewBox='0 0 12 7'%3E%3Cpath fill='%239ca3af' d='M6 7L0 0h12z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 13px center; margin-bottom: 16px; }
.select-user:focus { outline: none; border-color: #2563eb; }

.pin-label-txt { font-size: 12px; font-weight: 600; color: #6b7280; letter-spacing: .5px; text-transform: uppercase; display: block; margin-bottom: 10px; text-align: center; }
.pin-dots { display: flex; gap: 10px; justify-content: center; margin-bottom: 18px; }
.pin-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #d1d5db; transition: all .15s; }
.pin-dot.filled { background: #2563eb; border-color: #2563eb; }
.pin-dot.shake { animation: shake .3s; }
@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }

.keypad { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 10px; }
.key { padding: 16px 8px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: #fff; color: #111827; font-size: 20px; font-weight: 700; cursor: pointer; transition: all .1s; font-family: 'Inter',sans-serif; line-height: 1; -webkit-tap-highlight-color: transparent; user-select: none; }
.key:hover { background: #f3f4f6; border-color: #d1d5db; }
.key:active { transform: scale(.93); background: #e5e7eb; }
.key.del { color: #9ca3af; font-size: 15px; }
.key.empty { visibility: hidden; }
.err-msg { text-align: center; color: #ef4444; font-size: 12px; min-height: 18px; font-weight: 500; }

.btn-primary { width: 100%; padding: 14px; border-radius: 10px; border: none; background: #2563eb; color: #fff; font-family: 'Inter',sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: all .15s; }
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:active { transform: scale(.98); }
.btn-primary.danger { background: #ef4444; }
.btn-primary.danger:hover { background: #dc2626; }
.btn-ghost { background: none; border: none; color: #6b7280; font-family: 'Inter',sans-serif; font-size: 13px; cursor: pointer; padding: 8px; font-weight: 500; }
.btn-ghost:hover { color: #374151; }

/* ── TOPBAR ── */
.topbar { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 12px 16px; position: sticky; top: 0; z-index: 50; }
.topbar-inner { max-width: 720px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.topbar-brand { font-size: 16px; font-weight: 800; color: #111827; letter-spacing: -.3px; display: flex; align-items: center; gap: 8px; }
.topbar-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: #2563eb; }
.tab-nav { display: flex; background: #f3f4f6; border-radius: 8px; padding: 2px; gap: 1px; }
.tab-btn { padding: 6px 12px; border: none; border-radius: 6px; font-family: 'Inter',sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .12s; background: transparent; color: #6b7280; white-space: nowrap; }
.tab-btn:hover { color: #374151; }
.tab-btn.active { background: #fff; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.topbar-right { display: flex; align-items: center; gap: 8px; }
.clock-txt { font-size: 12px; color: #9ca3af; font-variant-numeric: tabular-nums; }
.exit-btn { padding: 6px 12px; border-radius: 7px; border: 1.5px solid #e5e7eb; background: #fff; color: #6b7280; font-family: 'Inter',sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .12s; }
.exit-btn:hover { border-color: #ef4444; color: #ef4444; }

/* ── EMP SCREEN ── */
.emp-outer { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: #f0f2f5; }
.emp-card-login { background: #fff; border-radius: 20px; box-shadow: 0 2px 16px rgba(0,0,0,.10); padding: 32px 24px; width: 100%; max-width: 340px; text-align: center; }
.emp-avatar-big { font-size: 52px; margin-bottom: 10px; }
.emp-name-big { font-size: 22px; font-weight: 800; color: #111827; }
.emp-role-txt { font-size: 13px; color: #6b7280; margin-top: 3px; font-weight: 500; }
.emp-status-row { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 14px 0 8px; }
.s-dot { width: 8px; height: 8px; border-radius: 50%; }
.s-txt { font-size: 13px; font-weight: 600; }
.emp-hours-strip { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #374151; margin-bottom: 18px; font-weight: 500; }
.emp-action-btn { width: 100%; padding: 16px; border-radius: 12px; border: none; font-family: 'Inter',sans-serif; font-size: 16px; font-weight: 700; cursor: pointer; transition: all .15s; -webkit-tap-highlight-color: transparent; }
.emp-action-btn.in  { background: #2563eb; color: #fff; }
.emp-action-btn.out { background: #ef4444; color: #fff; }
.emp-action-btn:active { transform: scale(.97); }

/* ── STAT CARDS ── */
.stats-row { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; margin-bottom: 16px; }
.stats-row.four { grid-template-columns: repeat(4,1fr); }
.stat-c { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04); padding: 14px 16px; }
.stat-c.blue { border-left: 3px solid #2563eb; }
.stat-lbl { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
.stat-val { font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -1px; line-height: 1; }
.stat-val.blue { color: #2563eb; }
.stat-val.red  { color: #ef4444; }
.stat-sub { font-size: 11px; color: #9ca3af; margin-top: 3px; }

/* ── SECTION TITLE ── */
.sec-t { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }

/* ── PEOPLE ROWS ── */
.people-grid { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.person-row { background: #fff; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.05), 0 0 0 1px rgba(0,0,0,.04); padding: 11px 14px; display: flex; align-items: center; gap: 10px; }
.person-av { font-size: 20px; width: 32px; text-align: center; flex-shrink: 0; }
.person-name { font-size: 14px; font-weight: 600; color: #111827; }
.person-sub  { font-size: 11px; color: #9ca3af; margin-top: 1px; }

/* ── BADGE ── */
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.badge .bd { width: 5px; height: 5px; border-radius: 50%; }
.badge.in  { background: #dcfce7; color: #15803d; }
.badge.in .bd  { background: #22c55e; }
.badge.out { background: #fee2e2; color: #dc2626; }
.badge.out .bd { background: #ef4444; }

/* ── TABLE ── */
.table-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead tr { border-bottom: 1.5px solid #f3f4f6; }
th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; }
td { padding: 11px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f9fafb; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #f9fafb; }
.td-name { font-weight: 600; color: #111827; }
.td-time { font-variant-numeric: tabular-nums; font-weight: 600; color: #2563eb; }
.td-date { font-variant-numeric: tabular-nums; color: #6b7280; }
.td-btn { padding: 4px 10px; border-radius: 6px; border: 1.5px solid #fee2e2; background: #fff; color: #ef4444; font-family: 'Inter',sans-serif; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .12s; }
.td-btn:hover { background: #fee2e2; }

/* ── FILTERS ── */
.filters { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
.fi { padding: 8px 11px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-family: 'Inter',sans-serif; font-size: 12px; font-weight: 500; }
.fi:focus { outline: none; border-color: #2563eb; }
.fi-btn { padding: 8px 14px; border-radius: 8px; border: none; background: #2563eb; color: #fff; font-family: 'Inter',sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .12s; white-space: nowrap; }
.fi-btn:hover { background: #1d4ed8; }
.fi-btn.sec { background: #fff; color: #374151; border: 1.5px solid #e5e7eb; }
.fi-btn.sec:hover { background: #f9fafb; }
.fi-cnt { font-size: 11px; color: #9ca3af; margin-left: auto; font-weight: 500; }

/* ── CSV BOX ── */
.csv-box { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.csv-title { font-size: 14px; font-weight: 700; color: #1d4ed8; margin-bottom: 12px; }

/* ── EMP CARDS (gestione) ── */
.emp-cards { display: grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap: 10px; }
.emp-c { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06),0 0 0 1px rgba(0,0,0,.04); padding: 14px; }
.emp-c-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.emp-c-av { width: 40px; height: 40px; border-radius: 50%; background: #eff6ff; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; border: 2px solid #bfdbfe; }
.emp-c-name { font-size: 14px; font-weight: 700; color: #111827; }
.emp-c-meta { font-size: 11px; color: #9ca3af; margin-top: 1px; }
.emp-c-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px; }
.ecs { background: #f9fafb; border-radius: 7px; padding: 6px 8px; }
.ecs-l { font-size: 9px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; }
.ecs-v { font-size: 15px; font-weight: 800; color: #111827; margin-top: 1px; }
.emp-c-btns { display: flex; gap: 6px; margin-top: 8px; }
.ec-btn { flex: 1; padding: 7px; border-radius: 7px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-family: 'Inter',sans-serif; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .12s; }
.ec-btn:hover { background: #f3f4f6; }
.ec-btn.del { color: #ef4444; border-color: #fecaca; }
.ec-btn.del:hover { background: #fee2e2; }
.prog-w { background: #f3f4f6; border-radius: 3px; height: 3px; overflow: hidden; margin-top: 6px; }
.prog   { height: 100%; border-radius: 3px; transition: width .4s; }

/* ── MODAL ── */
.modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 16px; }
.modal-box { background: #fff; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,.18); padding: 24px; width: 100%; max-width: 420px; max-height: 88vh; overflow-y: auto; }
.modal-title { font-size: 17px; font-weight: 800; color: #111827; margin-bottom: 18px; }
.f-field { margin-bottom: 13px; }
.f-lbl { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; display: block; margin-bottom: 5px; }
.f-inp { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; font-family: 'Inter',sans-serif; font-size: 13px; color: #111827; }
.f-inp:focus { outline: none; border-color: #2563eb; }
.f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.av-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 6px; margin-top: 6px; }
.av-o { font-size: 22px; padding: 7px; border-radius: 7px; border: 2px solid transparent; cursor: pointer; text-align: center; transition: all .1s; background: #f9fafb; }
.av-o:hover { border-color: #bfdbfe; }
.av-o.sel { border-color: #2563eb; background: #eff6ff; }
.modal-btns { display: flex; gap: 8px; margin-top: 18px; }
.m-btn { flex: 1; padding: 11px; border-radius: 9px; border: none; font-family: 'Inter',sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .12s; }
.m-btn.ok  { background: #2563eb; color: #fff; }
.m-btn.ok:hover { background: #1d4ed8; }
.m-btn.cx  { background: #f3f4f6; color: #374151; }
.m-btn.cx:hover { background: #e5e7eb; }
.m-btn.red { background: #ef4444; color: #fff; }
.m-btn.red:hover { background: #dc2626; }

/* ── TOAST ── */
.toast { position: fixed; bottom: 20px; right: 20px; padding: 11px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; z-index: 999; animation: tIn .2s ease; display: flex; align-items: center; gap: 7px; max-width: 260px; box-shadow: 0 4px 16px rgba(0,0,0,.15); font-family: 'Inter',sans-serif; }
.toast.ok  { background: #22c55e; color: #fff; }
.toast.err { background: #ef4444; color: #fff; }
@keyframes tIn { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }

/* ── PRESENCE BAR ── */
.pres-bar-wrap { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06),0 0 0 1px rgba(0,0,0,.04); padding: 14px 16px; margin-bottom: 16px; }
.pres-bar-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.pres-bar-bg { background: #f3f4f6; border-radius: 4px; height: 8px; overflow: hidden; }
.pres-bar-fill { height: 100%; border-radius: 4px; background: #2563eb; transition: width .5s; }

/* ── EMP REGISTRO ── */
.emp-reg-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.08); overflow: hidden; }
.emp-reg-header { background: #2563eb; padding: 16px 18px; }
.emp-reg-name { font-size: 17px; font-weight: 800; color: #fff; }
.emp-reg-sub { font-size: 12px; color: rgba(255,255,255,.75); margin-top: 2px; }

@media(max-width:540px){
  .stats-row.four { grid-template-columns: 1fr 1fr; }
  .page { padding: 12px; }
  .topbar { padding: 10px 12px; }
  .fi { min-width: 0; flex: 1; }
}
`;

/* ─── AVATARS ────────────────────────────────────────────────────────── */
const AVATARS = ["👨‍💻","👩‍💼","🎨","📊","💼","👩‍🏫","👨‍🔧","👩‍🔬","👨‍🎨","👩‍💻","👷","👩‍⚕️","🧑‍💼","👨‍🏫","👩‍🔧","🧑‍🔬"];

/* ─── COMPONENTS ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  return <div className={`toast ${type}`}>{type==="ok"?"✓":"✕"} {msg}</div>;
}

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return <span className="clock-txt">{t.toLocaleTimeString("it-IT")}</span>;
}

function PinKeypad({ value, onChange, onSubmit, error }) {
  const [shake, setShake] = useState(false);
  useEffect(() => { if (error) { setShake(true); setTimeout(() => setShake(false), 350); } }, [error]);
  const press = k => {
    if (k === "del") { onChange(value.slice(0,-1)); return; }
    if (value.length < 4) {
      const next = value + k;
      onChange(next);
      if (next.length === 4) setTimeout(() => onSubmit(next), 100);
    }
  };
  return <>
    <span className="pin-label-txt">Inserisci PIN</span>
    <div className="pin-dots">
      {[0,1,2,3].map(i=><div key={i} className={`pin-dot ${i<value.length?"filled":""} ${shake?"shake":""}`}/>)}
    </div>
    <div className="keypad">
      {["1","2","3","4","5","6","7","8","9","","0","del"].map((k,i)=>
        k==="" ? <div key={i} className="key empty"/> :
        <button key={i} className={`key ${k==="del"?"del":""}`} onClick={()=>press(k)}>
          {k==="del"?"⌫":k}
        </button>
      )}
    </div>
    <div className="err-msg">{error}</div>
  </>;
}

/* ── LOGIN ── */
function LoginScreen({ employees, onLogin }) {
  const [mode, setMode] = useState("emp"); // "emp" | "admin"
  const [sel,  setSel ] = useState(employees[0]?.id || 1);
  const [pin,  setPin ] = useState("");
  const [err,  setErr ] = useState("");

  const submit = p => {
    let matched = null;
    if (mode === "admin") {
      if (p === ADMIN_PIN) matched = { id:0, name:"Amministratore", isAdmin:true };
    } else {
      const e = employees.find(x => x.id === Number(sel));
      if (e && p === e.pin) matched = e;
    }
    if (matched) { onLogin(matched); setPin(""); setErr(""); }
    else { setErr("PIN errato"); setTimeout(() => { setPin(""); setErr(""); }, 1100); }
  };

  return (
    <div className="login-outer">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-name">🏢 Presenze</div>
          <div className="login-brand-sub">Gestione presenze dipendenti</div>
          <div className="login-brand-bar"/>
        </div>

        <div className="seg">
          <button className={`seg-btn ${mode==="emp"?"active":""}`}   onClick={()=>{setMode("emp");  setPin("");setErr("");}}>Dipendenti</button>
          <button className={`seg-btn ${mode==="admin"?"active":""}`} onClick={()=>{setMode("admin");setPin("");setErr("");}}>Admin</button>
        </div>

        {mode === "emp" && (
          <select className="select-user" value={sel} onChange={e=>{setSel(e.target.value);setPin("");setErr("");}}>
            {employees.map(e=><option key={e.id} value={e.id}>{e.avatar} {e.name}</option>)}
          </select>
        )}
        {mode === "admin" && (
          <p style={{textAlign:"center",fontSize:13,color:"#6b7280",marginBottom:16,fontWeight:500}}>Accesso riservato alla direzione</p>
        )}

        <PinKeypad value={pin} onChange={p=>{setPin(p);setErr("");}} onSubmit={submit} error={err}/>
      </div>
    </div>
  );
}

/* ── EMPLOYEE SCREEN ── */
function EmployeeScreen({ user, records, onRecord, onLogout, showToast }) {
  const [tab, setTab] = useState("home");
  // Track checkedIn locally so UI flips instantly on click
  const [checkedIn, setCheckedIn] = useState(() => isCheckedIn(records, user.id));

  const todayRecs = records.filter(r => r.empId===user.id && r.time>=today0());
  const todayH = calcHours(todayRecs, user.id);
  const lastIn = todayRecs.filter(r=>r.type==="in").sort((a,b)=>b.time-a.time)[0];
  const myRecs = records.filter(r => r.empId===user.id).slice(0,80);

  const handle = () => {
    const type = checkedIn ? "out" : "in";
    setCheckedIn(prev => !prev); // flip UI immediately
    const rec = { id: Date.now(), empId: user.id, type, time: new Date(), location: "Sede principale" };
    const commit = (finalRec) => {
      onRecord(finalRec);
      showToast(type==="in"?"Entrata registrata!":"Uscita registrata!", "ok");
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => { rec.location = `${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)}`; commit(rec); },
        () => commit(rec),
        { timeout: 4000 }
      );
    } else {
      commit(rec);
    }
  };

  return (
    <div className="app">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand">
            <div className="topbar-brand-dot"/>
            Presenze
          </div>
          <div className="tab-nav">
            <button className={`tab-btn ${tab==="home"?"active":""}`}     onClick={()=>setTab("home")}>Timbratura</button>
            <button className={`tab-btn ${tab==="registro"?"active":""}`} onClick={()=>setTab("registro")}>Registro</button>
          </div>
          <button className="exit-btn" onClick={onLogout}>← Esci</button>
        </div>
      </div>

      {tab === "home" && (
        <div className="emp-outer" style={{paddingTop:60}}>
          <div className="emp-card-login">
            <div className="emp-avatar-big">{user.avatar}</div>
            <div className="emp-name-big">{user.name}</div>
            <div className="emp-role-txt">{user.role} · {user.dept}</div>
            <div className="emp-status-row">
              <div className="s-dot" style={{background:checkedIn?"#22c55e":"#ef4444", boxShadow:checkedIn?"0 0 7px #22c55e":"none"}}/>
              <span className="s-txt" style={{color:checkedIn?"#15803d":"#dc2626"}}>{checkedIn?"In sede":"Fuori sede"}</span>
            </div>
            <div className="emp-hours-strip">
              ⏱ Ore oggi: <strong>{todayH}h</strong>
              {checkedIn&&lastIn&&<> · entrato alle <strong>{fmtT(lastIn.time)}</strong></>}
            </div>
            {checkedIn&&lastIn&&(
              <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#166534",marginBottom:18,lineHeight:1.6}}>
                <div>📅 <strong>{fmtD(lastIn.time)}</strong></div>
                <div>🕐 Entrata: <strong>{fmtT(lastIn.time)}</strong></div>
                {lastIn.location && lastIn.location !== "Sede principale" && (
                  <div>📍 <a href={`https://maps.google.com/?q=${lastIn.location}`} target="_blank" rel="noreferrer" style={{color:"#15803d",fontWeight:600}}>{lastIn.location}</a></div>
                )}
                {(!lastIn.location || lastIn.location === "Sede principale") && (
                  <div>📍 Sede principale</div>
                )}
              </div>
            )}
            {!checkedIn&&todayRecs.length>0&&(
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#991b1b",marginBottom:18,lineHeight:1.6}}>
                <div>📅 Ultima timbratura: <strong>{fmtD(todayRecs[0].time)}</strong></div>
                <div>🕐 Uscita: <strong>{fmtT(todayRecs[0].time)}</strong></div>
              </div>
            )}
            <button className={`emp-action-btn ${checkedIn?"out":"in"}`} onClick={handle}>
              {checkedIn?"⏹ Registra Uscita":"▶ Registra Entrata"}
            </button>
            <div style={{textAlign:"center",marginTop:12}}>
              <button className="btn-ghost" onClick={onLogout}>← Cambia utente</button>
            </div>
          </div>
        </div>
      )}

      {tab === "registro" && (
        <div className="page" style={{paddingTop:16}}>
          <div className="emp-reg-card">
            <div className="emp-reg-header">
              <div className="emp-reg-name">{user.avatar} {user.name}</div>
              <div className="emp-reg-sub">Le tue ultime timbrature</div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Ora</th>
                    <th>Tipo</th>
                    <th>Sede</th>
                  </tr>
                </thead>
                <tbody>
                  {myRecs.length === 0 && (
                    <tr><td colSpan={4} style={{textAlign:"center",color:"#9ca3af",padding:"20px"}}>Nessuna timbratura</td></tr>
                  )}
                  {myRecs.map(r=>(
                    <tr key={r.id}>
                      <td className="td-date">{fmtD(r.time)}</td>
                      <td className="td-time">{fmtT(r.time)}</td>
                      <td><span className={`badge ${r.type}`}><span className="bd"/>{r.type==="in"?"Entrata":"Uscita"}</span></td>
                      <td style={{color:"#9ca3af",fontSize:12}}>{r.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── ADMIN DASHBOARD ── */
function AdminDashboard({ records, employees }) {
  const presenti  = employees.filter(e=>isCheckedIn(records,e.id));
  const assenti   = employees.filter(e=>!isCheckedIn(records,e.id));
  const todayRecs = records.filter(r=>r.time>=today0());
  const inR       = todayRecs.filter(r=>r.type==="in");
  const avgMs     = inR.length ? inR.reduce((s,r)=>s+r.time.getTime(),0)/inR.length : null;

  return <>
    <div style={{fontWeight:800,fontSize:20,color:"#111827",marginBottom:14,letterSpacing:"-.3px"}}>Dashboard Presenze</div>

    <div className="stats-row four">
      <div className="stat-c blue">
        <div className="stat-lbl">Presenti ora</div>
        <div className="stat-val blue">{presenti.length}</div>
        <div className="stat-sub">su {employees.length} dip.</div>
      </div>
      <div className="stat-c">
        <div className="stat-lbl">Assenti</div>
        <div className="stat-val red">{assenti.length}</div>
        <div className="stat-sub">oggi</div>
      </div>
      <div className="stat-c">
        <div className="stat-lbl">Timbrature</div>
        <div className="stat-val">{todayRecs.length}</div>
        <div className="stat-sub">oggi</div>
      </div>
      <div className="stat-c">
        <div className="stat-lbl">Media entrata</div>
        <div className="stat-val" style={{fontSize:20,letterSpacing:0}}>{avgMs?fmtT(new Date(avgMs)):"--:--"}</div>
        <div className="stat-sub">oggi</div>
      </div>
    </div>

    <div className="pres-bar-wrap">
      <div className="pres-bar-row">
        <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{presenti.length} di {employees.length} presenti</span>
        <span style={{fontSize:18,fontWeight:800,color:"#2563eb"}}>{Math.round(presenti.length/Math.max(employees.length,1)*100)}%</span>
      </div>
      <div className="pres-bar-bg">
        <div className="pres-bar-fill" style={{width:`${presenti.length/Math.max(employees.length,1)*100}%`}}/>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
      <div>
        <div className="sec-t">In sede ora</div>
        <div className="people-grid">
          {presenti.length===0 && <div style={{fontSize:13,color:"#9ca3af",padding:"8px 0"}}>Nessuno in sede</div>}
          {presenti.map(e=>{
            const li=records.filter(r=>r.empId===e.id&&r.type==="in"&&r.time>=today0()).sort((a,b)=>b.time-a.time)[0];
            const mins=li?Math.floor((new Date()-li.time)/60000):0;
            return <div key={e.id} className="person-row">
              <div className="person-av">{e.avatar}</div>
              <div style={{flex:1}}>
                <div className="person-name">{e.name}</div>
                <div className="person-sub">{li?`da ${fmtT(li.time)}`:""} · {Math.floor(mins/60)}h{mins%60}m</div>
              </div>
              <span className="badge in"><span className="bd"/>In sede</span>
            </div>;
          })}
        </div>
      </div>
      <div>
        <div className="sec-t">Assenti oggi</div>
        <div className="people-grid">
          {assenti.map(e=>(
            <div key={e.id} className="person-row">
              <div className="person-av" style={{opacity:.4}}>{e.avatar}</div>
              <div style={{flex:1}}>
                <div className="person-name">{e.name}</div>
                <div className="person-sub">{e.dept}</div>
              </div>
              <span className="badge out"><span className="bd"/>Assente</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="sec-t">Ultime timbrature</div>
    <div className="table-wrap">
      <table>
        <thead><tr><th>Dipendente</th><th>Tipo</th><th>Ora</th><th>Sede</th></tr></thead>
        <tbody>
          {records.filter(r=>r.time>=today0()).slice(0,10).map(r=>{
            const e=employees.find(x=>x.id===r.empId);
            return <tr key={r.id}>
              <td className="td-name">{e?.avatar} {e?.name}</td>
              <td><span className={`badge ${r.type}`}><span className="bd"/>{r.type==="in"?"Entrata":"Uscita"}</span></td>
              <td className="td-time">{fmtT(r.time)}</td>
              <td style={{color:"#9ca3af",fontSize:12}}>{r.location}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </>;
}

/* ── ADMIN REGISTRO ── */
function AdminRegistro({ records, setRecords, employees }) {
  const [empF, setEmpF]   = useState("all");
  const [fromF,setFromF]  = useState("");
  const [toF,  setToF]    = useState("");
  const [typeF,setTypeF]  = useState("all");
  const [cEmp, setCEmp]   = useState("all");
  const [cFrom,setCFrom]  = useState("");
  const [cTo,  setCTo]    = useState("");
  const [delConfirm, setDelConfirm] = useState(null); // record to delete

  const filtered = records.filter(r=>{
    if(empF!=="all"&&r.empId!==Number(empF)) return false;
    if(fromF){const f=new Date(fromF);f.setHours(0,0,0,0);if(r.time<f)return false;}
    if(toF){const t=new Date(toF);t.setHours(23,59,59,999);if(r.time>t)return false;}
    if(typeF!=="all"&&r.type!==typeF) return false;
    return true;
  }).slice(0,300);

  const deleteRecord = async id => {
    setRecords(prev => prev.filter(r => r.id !== id));
    setDelConfirm(null);
    await dbDeleteRecord(id);
  };

  return <>
    <div style={{fontWeight:800,fontSize:20,color:"#111827",marginBottom:14,letterSpacing:"-.3px"}}>Registro Timbrature</div>

    <div className="csv-box">
      <div className="csv-title">⬇ Esporta CSV</div>
      <div className="filters" style={{marginBottom:0}}>
        <select className="fi" value={cEmp} onChange={e=>setCEmp(e.target.value)}>
          <option value="all">Tutti i dipendenti</option>
          {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input type="date" className="fi" value={cFrom} onChange={e=>setCFrom(e.target.value)} style={{flex:"none",width:136}}/>
        <input type="date" className="fi" value={cTo}   onChange={e=>setCTo(e.target.value)}   style={{flex:"none",width:136}}/>
        <button className="fi-btn" onClick={()=>exportCSV(records,employees,cEmp,cFrom,cTo)}>⬇ Scarica CSV</button>
      </div>
    </div>

    <div className="filters">
      <select className="fi" value={empF}  onChange={e=>setEmpF(e.target.value)}>
        <option value="all">Tutti</option>
        {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
      </select>
      <input type="date" className="fi" value={fromF} onChange={e=>setFromF(e.target.value)} style={{flex:"none",width:136}}/>
      <input type="date" className="fi" value={toF}   onChange={e=>setToF(e.target.value)}   style={{flex:"none",width:136}}/>
      <select className="fi" value={typeF} onChange={e=>setTypeF(e.target.value)}>
        <option value="all">Tutti</option>
        <option value="in">Entrate</option>
        <option value="out">Uscite</option>
      </select>
      <button className="fi-btn sec" onClick={()=>{setEmpF("all");setFromF("");setToF("");setTypeF("all");}}>Reset</button>
      <span className="fi-cnt">{filtered.length} record</span>
    </div>

    <div className="table-wrap">
      <table>
        <thead><tr><th>Data</th><th>Ora</th><th>Dipendente</th><th>Reparto</th><th>Tipo</th><th>Sede</th><th></th></tr></thead>
        <tbody>
          {filtered.length===0 && <tr><td colSpan={7} style={{textAlign:"center",color:"#9ca3af",padding:"20px"}}>Nessun record trovato</td></tr>}
          {filtered.map(r=>{
            const e=employees.find(x=>x.id===r.empId);
            return <tr key={r.id}>
              <td className="td-date">{fmtD(r.time)}</td>
              <td className="td-time">{fmtT(r.time)}</td>
              <td className="td-name">{e?.avatar} {e?.name}</td>
              <td style={{color:"#9ca3af",fontSize:12}}>{e?.dept}</td>
              <td><span className={`badge ${r.type}`}><span className="bd"/>{r.type==="in"?"Entrata":"Uscita"}</span></td>
              <td style={{color:"#9ca3af",fontSize:12}}>{r.location}</td>
              <td><button className="td-btn" onClick={()=>setDelConfirm(r)}>Elimina</button></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    {delConfirm && (
      <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&setDelConfirm(null)}>
        <div className="modal-box" style={{maxWidth:320,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:10}}>🗑️</div>
          <div className="modal-title" style={{justifyContent:"center"}}>Elimina record?</div>
          <p style={{fontSize:13,color:"#6b7280",marginBottom:6}}>
            {employees.find(e=>e.id===delConfirm.empId)?.name}
          </p>
          <p style={{fontSize:14,fontWeight:600,color:"#374151",marginBottom:18}}>
            {r => r}{delConfirm.type==="in"?"Entrata":"Uscita"} — {fmtD(delConfirm.time)} {fmtT(delConfirm.time)}
          </p>
          <div className="modal-btns">
            <button className="m-btn cx" onClick={()=>setDelConfirm(null)}>Annulla</button>
            <button className="m-btn red" onClick={()=>deleteRecord(delConfirm.id)}>Elimina</button>
          </div>
        </div>
      </div>
    )}
  </>;
}

/* ── EMPLOYEE MODAL ── */
function EmpModal({ emp, onSave, onClose }) {
  const isNew = !emp;
  const [f, setF] = useState(emp?{...emp}:{name:"",role:"",dept:"",pin:"",email:"",phone:"",avatar:"👤",target:8,color:"#2563eb"});
  const set = (k,v) => setF(x=>({...x,[k]:v}));
  const save = () => { if(!f.name.trim()||!f.pin.trim()) return; onSave(isNew?{...f,id:Date.now()}:f); };

  return (
    <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box">
        <div className="modal-title">{isNew?"➕ Nuovo Dipendente":"✏️ Modifica Dipendente"}</div>
        <div className="f-field">
          <span className="f-lbl">Avatar</span>
          <div className="av-grid">
            {AVATARS.map(a=><div key={a} className={`av-o ${f.avatar===a?"sel":""}`} onClick={()=>set("avatar",a)}>{a}</div>)}
          </div>
        </div>
        <div className="f-row">
          <div className="f-field"><span className="f-lbl">Nome *</span><input className="f-inp" value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Mario Rossi"/></div>
          <div className="f-field"><span className="f-lbl">PIN 4 cifre *</span><input className="f-inp" value={f.pin} onChange={e=>set("pin",e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="1234" maxLength={4}/></div>
        </div>
        <div className="f-row">
          <div className="f-field"><span className="f-lbl">Ruolo</span><input className="f-inp" value={f.role} onChange={e=>set("role",e.target.value)} placeholder="Sviluppatore"/></div>
          <div className="f-field"><span className="f-lbl">Reparto</span><input className="f-inp" value={f.dept} onChange={e=>set("dept",e.target.value)} placeholder="IT"/></div>
        </div>
        <div className="f-row">
          <div className="f-field"><span className="f-lbl">Email</span><input className="f-inp" type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="m@azienda.it"/></div>
          <div className="f-field"><span className="f-lbl">Telefono</span><input className="f-inp" value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="333 0000000"/></div>
        </div>
        <div className="f-field"><span className="f-lbl">Colore accento</span><input className="f-inp" type="color" value={f.color} onChange={e=>set("color",e.target.value)} style={{height:38,padding:"3px 6px",cursor:"pointer"}}/></div>
        <div className="modal-btns">
          <button className="m-btn cx" onClick={onClose}>Annulla</button>
          <button className="m-btn ok" onClick={save}>{isNew?"Crea Dipendente":"Salva Modifiche"}</button>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN DIPENDENTI ── */
function AdminDipendenti({ employees, records, onAdd, onEdit, onDelete }) {
  const [modal,   setModal]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detail,  setDetail]  = useState(null); // emp per il pannello dettaglio

  // Raggruppa timbrature per giorno per un dipendente
  function getDailyHours(empId) {
    const recs = records.filter(r => r.empId===empId).sort((a,b)=>a.time-b.time);
    const days = {};
    let lastIn = null;
    recs.forEach(r => {
      const day = fmtD(r.time);
      if (!days[day]) days[day] = { inTime: null, outTime: null, hours: 0, entries: [] };
      days[day].entries.push(r);
      if (r.type==="in") { lastIn = r.time; if (!days[day].inTime) days[day].inTime = r.time; }
      else if (r.type==="out" && lastIn) {
        days[day].hours += (r.time - lastIn) / 3600000;
        days[day].outTime = r.time;
        lastIn = null;
      }
    });
    // round hours
    Object.values(days).forEach(d => { d.hours = Math.round(d.hours*10)/10; });
    return Object.entries(days).sort((a,b) => new Date(b[0].split("/").reverse().join("-")) - new Date(a[0].split("/").reverse().join("-")));
  }

  return <>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontWeight:800,fontSize:20,color:"#111827",letterSpacing:"-.3px"}}>Gestione Dipendenti</div>
      <button className="fi-btn" onClick={()=>setModal("new")} style={{padding:"8px 16px",borderRadius:9,fontSize:13}}>+ Nuovo</button>
    </div>
    <div className="emp-cards">
      {employees.map(emp=>{
        const ci  = isCheckedIn(records,emp.id);
        const todH = calcHours(records.filter(r=>r.empId===emp.id&&r.time>=today0()),emp.id);
        const wkH  = calcHours(records.filter(r=>r.empId===emp.id),emp.id);
        return <div key={emp.id} className="emp-c">
          <div className="emp-c-top">
            <div className="emp-c-av" style={{borderColor:emp.color||"#bfdbfe"}}>{emp.avatar}</div>
            <div style={{flex:1}}>
              <div className="emp-c-name">{emp.name}</div>
              <div className="emp-c-meta">{emp.role} · {emp.dept}</div>
              <div style={{marginTop:4}}><span className={`badge ${ci?"in":"out"}`}><span className="bd"/>{ci?"In sede":"Assente"}</span></div>
            </div>
          </div>
          <div className="emp-c-stats">
            {[["Oggi",`${todH}h`],["Settimana",`${wkH}h`]].map(([l,v])=>(
              <div key={l} className="ecs"><div className="ecs-l">{l}</div><div className="ecs-v">{v}</div></div>
            ))}
          </div>
          {emp.email&&<div style={{fontSize:11,color:"#9ca3af",marginBottom:6}}>✉ {emp.email}</div>}
          <div className="emp-c-btns">
            <button className="ec-btn" onClick={()=>setDetail(emp)}>📋 Dettaglio</button>
            <button className="ec-btn" onClick={()=>setModal(emp)}>✏️ Modifica</button>
            <button className="ec-btn del" onClick={()=>setConfirm(emp)}>🗑 Elimina</button>
          </div>
        </div>;
      })}
    </div>

    {modal&&<EmpModal emp={modal==="new"?null:modal} onSave={d=>{modal==="new"?onAdd(d):onEdit(d);setModal(null);}} onClose={()=>setModal(null)}/>}

    {detail&&(
      <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&setDetail(null)}>
        <div className="modal-box" style={{maxWidth:480}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
            <div style={{fontSize:32}}>{detail.avatar}</div>
            <div>
              <div style={{fontWeight:800,fontSize:17,color:"#111827"}}>{detail.name}</div>
              <div style={{fontSize:12,color:"#9ca3af"}}>{detail.role} · {detail.dept}</div>
            </div>
            <button onClick={()=>setDetail(null)} style={{marginLeft:"auto",background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#9ca3af"}}>×</button>
          </div>
          <div style={{fontWeight:700,fontSize:13,color:"#6b7280",textTransform:"uppercase",letterSpacing:".5px",marginBottom:10}}>Ore per giornata</div>
          <div style={{maxHeight:400,overflowY:"auto"}}>
            {getDailyHours(detail.id).length===0 && <div style={{color:"#9ca3af",fontSize:13,textAlign:"center",padding:"20px 0"}}>Nessuna timbratura</div>}
            {getDailyHours(detail.id).map(([day, d])=>(
              <div key={day} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:"#111827"}}>{day}</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>
                    {d.inTime && <span style={{color:"#15803d"}}>▶ {fmtT(d.inTime)}</span>}
                    {d.outTime && <span style={{color:"#dc2626",marginLeft:10}}>⏹ {fmtT(d.outTime)}</span>}
                    {!d.outTime && d.inTime && <span style={{color:"#f59e0b",marginLeft:10}}>ancora in sede</span>}
                  </div>
                </div>
                <div style={{fontWeight:800,fontSize:22,color: d.hours>=8?"#15803d":d.hours>0?"#2563eb":"#9ca3af",letterSpacing:"-1px"}}>
                  {d.hours>0 ? `${d.hours}h` : "—"}
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:14,paddingTop:14,borderTop:"1.5px solid #e5e7eb",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:"#6b7280",fontWeight:600}}>Totale periodo</span>
            <span style={{fontSize:20,fontWeight:800,color:"#2563eb"}}>
              {Math.round(getDailyHours(detail.id).reduce((s,[,d])=>s+d.hours,0)*10)/10}h
            </span>
          </div>
        </div>
      </div>
    )}

    {confirm&&(
      <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&setConfirm(null)}>
        <div className="modal-box" style={{maxWidth:300,textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:8}}>⚠️</div>
          <div className="modal-title">Elimina dipendente?</div>
          <p style={{fontSize:13,color:"#6b7280",marginBottom:18}}>Vuoi eliminare <strong>{confirm.name}</strong>?<br/>Le timbrature rimarranno nel registro.</p>
          <div className="modal-btns">
            <button className="m-btn cx" onClick={()=>setConfirm(null)}>Annulla</button>
            <button className="m-btn red" onClick={()=>{onDelete(confirm.id);setConfirm(null);}}>Elimina</button>
          </div>
        </div>
      </div>
    )}
  </>;
}

/* ── ADMIN SHELL ── */
function AdminShell({ employees, records, setRecords, onLogout, onAdd, onEdit, onDelete }) {
  const [tab, setTab] = useState("dashboard");
  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand"><div className="topbar-brand-dot"/>Presenze</div>
          <div className="tab-nav">
            {[["dashboard","Dashboard"],["registro","Registro"],["dipendenti","Dipendenti"]].map(([id,l])=>(
              <button key={id} className={`tab-btn ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{l}</button>
            ))}
          </div>
          <div className="topbar-right">
            <LiveClock/>
            <button className="exit-btn" onClick={onLogout}>← Esci</button>
          </div>
        </div>
      </div>
      <div className="page" style={{paddingTop:20}}>
        {tab==="dashboard"  && <AdminDashboard records={records} employees={employees}/>}
        {tab==="registro"   && <AdminRegistro  records={records} setRecords={setRecords} employees={employees}/>}
        {tab==="dipendenti" && <AdminDipendenti employees={employees} records={records} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}/>}
      </div>
    </div>
  );
}

/* ─── ROOT ───────────────────────────────────────────────────────────── */
export default function App() {
  const [employees, setEmployees] = useState([]);
  const [records,   setRecords  ] = useState([]);
  const [loading,   setLoading  ] = useState(true);
  const [user,      setUser     ] = useState(null);
  const [toast,     setToast    ] = useState(null);

  // Load all data from Supabase on startup
  useEffect(() => {
    async function init() {
      setLoading(true);
      const [emps, recs] = await Promise.all([dbLoadEmployees(), dbLoadRecords()]);
      if (emps) setEmployees(emps);
      if (recs) setRecords(recs);
      setLoading(false);
    }
    init();
  }, []);

  const showToast = (msg, type="ok") => setToast({msg, type, k: Date.now()});

  const addRecord = async (rec) => {
    setRecords(p => [rec, ...p]); // optimistic update
    await dbInsertRecord(rec);
  };

  const addEmp = async (emp) => {
    setEmployees(p => [...p, emp]);
    await dbInsertEmployee(emp);
    showToast(`${emp.name} aggiunto`);
  };

  const editEmp = async (emp) => {
    setEmployees(p => p.map(x => x.id===emp.id ? emp : x));
    await dbUpdateEmployee(emp);
    showToast("Modifiche salvate");
  };

  const deleteEmp = async (id) => {
    setEmployees(p => p.filter(x => x.id!==id));
    await dbDeleteEmployee(id);
    showToast("Dipendente eliminato");
  };

  if (loading) return (
    <div>
      <style>{css}</style>
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#f0f2f5",gap:16}}>
        <div style={{fontSize:36}}>🏢</div>
        <div style={{fontSize:18,fontWeight:700,color:"#111827",fontFamily:"Inter,sans-serif"}}>Presenze</div>
        <div style={{fontSize:13,color:"#9ca3af",fontFamily:"Inter,sans-serif"}}>Caricamento in corso...</div>
        <div style={{width:40,height:40,border:"3px solid #e5e7eb",borderTop:"3px solid #2563eb",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      </div>
    </div>
  );

  return (
    <div>
      <style>{css}</style>

      {!user && <LoginScreen employees={employees} onLogin={setUser}/>}

      {user?.isAdmin && (
        <AdminShell
          employees={employees} records={records} setRecords={setRecords}
          onLogout={()=>setUser(null)}
          onAdd={addEmp} onEdit={editEmp} onDelete={deleteEmp}
        />
      )}

      {user && !user.isAdmin && (
        <EmployeeScreen
          key={user.id}
          user={user} records={records}
          onRecord={addRecord}
          onLogout={()=>setUser(null)}
          showToast={showToast}
        />
      )}

      {toast && <Toast key={toast.k} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
