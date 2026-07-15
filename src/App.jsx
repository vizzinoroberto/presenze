import { useState, useEffect, useCallback } from "react";

/* ─── SUPABASE ───────────────────────────────────────────────────────── */
const SUPA_URL = "https://ywrbatklgymaziosucuo.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cmJhdGtsZ3ltYXppb3N1Y3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzk4NzAsImV4cCI6MjA5MDgxNTg3MH0.euAYuj4cTvd3M3mgQSKQPnlarLZvZssjpnhki79mdpM";
const H = { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY };

async function sbFetch(path, opts={}) {
  try {
    const res = await fetch(SUPA_URL + "/rest/v1/" + path, { ...opts, headers: { ...H, ...opts.headers } });
    if (!res.ok) { const e = await res.text(); console.error("Supabase error:", e); return null; }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("Fetch error:", e);
    return null;
  }
}

// ── Dipendenti
async function dbLoadEmployees() {
  const data = await sbFetch("dipendenti?select=*&order=name");
  if (!data) return null;
  return data.map(r => ({ id: r.id, name: r.name, role: r.role||"", dept: r.dept||"", pin: r.pin, email: r.email||"", phone: r.phone||"", avatar: r.avatar||"👤", target: r.target||8, color: r.color||"#2563eb", in_turni: r.in_turni || false }));
}
async function dbInsertEmployee(emp) {
  return sbFetch("dipendenti", { method:"POST", headers:{"Prefer":"return=representation"}, body: JSON.stringify({ id:emp.id, name:emp.name, role:emp.role, dept:emp.dept, pin:emp.pin, email:emp.email, phone:emp.phone, avatar:emp.avatar, target:emp.target, color:emp.color, in_turni:emp.in_turni||false }) });
}
async function dbUpdateEmployee(emp) {
  return sbFetch(`dipendenti?id=eq.${emp.id}`, { method:"PATCH", headers:{"Prefer":"return=representation"}, body: JSON.stringify({ name:emp.name, role:emp.role, dept:emp.dept, pin:emp.pin, email:emp.email, phone:emp.phone, avatar:emp.avatar, target:emp.target, color:emp.color, in_turni:emp.in_turni||false }) });
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
  return sbFetch("timbrature", { method:"POST", headers:{"Prefer":"return=representation"}, body: JSON.stringify({ id: String(rec.id), emp_id: rec.empId, type: rec.type, time: rec.time.toISOString(), location: rec.location }) });
}
async function dbDeleteRecord(id) {
  return sbFetch(`timbrature?id=eq.${id}`, { method:"DELETE" });
}
async function dbUpdateRecordTime(rec, newTime) {
  await sbFetch(`timbrature?id=eq.${rec.id}`, { method:"DELETE" });
  return sbFetch("timbrature", { method:"POST", headers:{"Prefer":"return=representation"},
    body: JSON.stringify({ id: String(rec.id), emp_id: rec.empId, type: rec.type, time: newTime.toISOString(), location: rec.location }) });
}

// ── Turni Arcobaleno (sola lettura dall'app esterna)
const TURNI_URL = "https://rvzikapecolurexiaoqs.supabase.co";
const TURNI_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2emlrYXBlY29sdXJleGlhb3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzY1MTUsImV4cCI6MjA5MDYxMjUxNX0.BmWfgJ7ycRA3O5zSC4q2bba6VBtxOUjUSO7e1xHxpf4";
const TH = { "apikey": TURNI_KEY, "Authorization": "Bearer " + TURNI_KEY };

async function dbLoadTurniEsterni() {
  try {
    const res = await fetch(TURNI_URL + "/rest/v1/turni?select=chiave,valore", { headers: TH });
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    data.forEach(r => { map[r.chiave] = r.valore; });
    return map;
  } catch { return {}; }
}

/* ─── TURNI CONSTANTS ──────────────────────────────────────────────────── */
const PRANZO_OPTIONS = [
  { v:"",  l:"—"    },
  { v:"Q", l:"11:30"},
  { v:"W", l:"12:00"},
  { v:"F", l:"Ferie"},
];
const CENA_OPTIONS = [
  { v:"",  l:"—"    },
  { v:"1", l:"18:00"},
  { v:"2", l:"18:00"},
  { v:"3", l:"18:30"},
  { v:"4", l:"18:30"},
  { v:"5", l:"19:00"},
  { v:"6", l:"19:30"},
  { v:"7", l:"19:30"},
  { v:"F", l:"Ferie"},
];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0,0,0,0);
  return mon;
}
function shiftLabel(tipo, val) {
  if (!val) return "—";
  const opts = tipo === "pranzo" ? PRANZO_OPTIONS : CENA_OPTIONS;
  return opts.find(o => o.v === val)?.l || val;
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
const fmtDateFriendly = d => {
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const ieri = new Date(oggi); ieri.setDate(ieri.getDate()-1);
  const dd = new Date(d); dd.setHours(0,0,0,0);
  if (dd.getTime()===oggi.getTime()) return "Oggi";
  if (dd.getTime()===ieri.getTime()) return "Ieri";
  return d.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
};

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
.topbar-brand { font-size: 16px; font-weight: 800; color: #111827; letter-spacing: -.3px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.topbar-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: #2563eb; }
.tab-nav { display: flex; background: #f3f4f6; border-radius: 8px; padding: 2px; gap: 1px; overflow-x: auto; max-width: 100%; }
.tab-nav::-webkit-scrollbar { display: none; }
.tab-btn { padding: 6px 10px; border: none; border-radius: 6px; font-family: 'Inter',sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .12s; background: transparent; color: #6b7280; white-space: nowrap; flex-shrink: 0; }
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

/* ── NUOVO TIMBRATORE ── */
.tmb-outer { min-height:100vh; display:flex; flex-direction:column; background:#f0f2f5; }
.tmb-header { background:#fff; padding:14px 20px; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; justify-content:space-between; }
.tmb-brand { font-size:15px; font-weight:800; color:#111827; display:flex; align-items:center; gap:8px; }
.tmb-brand-dot { width:8px; height:8px; border-radius:50%; background:#2563eb; }
.tmb-tabs { display:flex; background:#f3f4f6; border-radius:8px; padding:2px; }
.tmb-tab { padding:6px 14px; border:none; border-radius:6px; font-family:'Inter',sans-serif; font-size:13px; font-weight:600; cursor:pointer; background:transparent; color:#6b7280; transition:all .12s; }
.tmb-tab.active { background:#fff; color:#111827; box-shadow:0 1px 3px rgba(0,0,0,.1); }

.tmb-body { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px 20px; gap:0; }
.tmb-name { font-size:20px; font-weight:800; color:#111827; margin-bottom:2px; text-align:center; }
.tmb-role { font-size:13px; color:#9ca3af; margin-bottom:28px; text-align:center; }

.tmb-clock-box { background:#fff; border-radius:24px; box-shadow:0 2px 20px rgba(0,0,0,.08); padding:28px 40px; text-align:center; margin-bottom:28px; min-width:260px; }
.tmb-time { font-size:52px; font-weight:800; color:#111827; letter-spacing:-2px; line-height:1; font-variant-numeric:tabular-nums; }
.tmb-date { font-size:15px; color:#6b7280; margin-top:6px; font-weight:500; }
.tmb-status { display:flex; align-items:center; justify-content:center; gap:7px; margin-top:14px; }
.tmb-sdot { width:10px; height:10px; border-radius:50%; }
.tmb-stxt { font-size:13px; font-weight:700; }

.tmb-btn-wrap { display:flex; gap:14px; margin-bottom:28px; }
.tmb-btn { width:130px; height:130px; border-radius:50%; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; font-family:'Inter',sans-serif; font-size:14px; font-weight:700; color:#fff; transition:all .15s; box-shadow:0 4px 20px rgba(0,0,0,.15); -webkit-tap-highlight-color:transparent; }
.tmb-btn:active { transform:scale(.93); }
.tmb-btn.in  { background:linear-gradient(135deg,#22c55e,#16a34a); box-shadow:0 4px 20px rgba(34,197,94,.35); }
.tmb-btn.out { background:linear-gradient(135deg,#ef4444,#dc2626); box-shadow:0 4px 20px rgba(239,68,68,.35); }
.tmb-btn.disabled { background:#e5e7eb; color:#9ca3af; box-shadow:none; cursor:default; }
.tmb-btn svg { width:36px; height:36px; }

.tmb-info { background:#fff; border-radius:14px; box-shadow:0 1px 6px rgba(0,0,0,.06); padding:14px 20px; min-width:260px; font-size:13px; color:#374151; line-height:1.8; }
.tmb-info-row { display:flex; align-items:center; gap:8px; }
.tmb-info-icon { font-size:16px; width:22px; text-align:center; flex-shrink:0; }
.tmb-info-val { font-weight:600; }

/* ── REGISTRO AMICHEVOLE ── */
.reg-outer { flex:1; padding:16px 16px 30px; overflow-y:auto; }
.reg-day-group { margin-bottom:20px; }
.reg-day-label { font-size:12px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; padding:0 4px; }
.reg-row { background:#fff; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,.06); padding:13px 16px; display:flex; align-items:center; gap:12px; margin-bottom:6px; }
.reg-icon { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:16px; }
.reg-icon.in  { background:#dcfce7; }
.reg-icon.out { background:#fee2e2; }
.reg-type { font-size:14px; font-weight:700; color:#111827; }
.reg-time-big { font-size:22px; font-weight:800; color:#111827; letter-spacing:-1px; }
.reg-loc { font-size:11px; color:#9ca3af; margin-top:2px; }
.reg-ore { margin-left:auto; text-align:right; }
.reg-ore-val { font-size:20px; font-weight:800; color:#2563eb; letter-spacing:-1px; }
.reg-ore-lbl { font-size:10px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
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

/* ── RIEPILOGO PERIODO ── */
.riep-day-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); margin-bottom: 8px; overflow: hidden; }
.riep-day-row { display: flex; align-items: center; gap: 12px; padding: 13px 16px; }
.riep-day-name { font-size: 15px; font-weight: 700; color: #111827; text-transform: capitalize; }
.riep-day-date { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.riep-day-hours { font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -1px; white-space: nowrap; }
.riep-det-btn { padding: 5px 12px; border-radius: 7px; border: 1.5px solid #e5e7eb; background: #fff; color: #374151; font-family: 'Inter',sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all .12s; }
.riep-det-btn:hover { background: #f3f4f6; }
.riep-detail { border-top: 1px solid #f3f4f6; padding: 10px 16px; display: flex; flex-direction: column; gap: 6px; }
.riep-rec { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; background: #f9fafb; }
.riep-total { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.riep-total-val { font-size: 26px; font-weight: 800; color: #1d4ed8; letter-spacing: -1px; }
.range-bar { display: flex; gap: 8px; margin-bottom: 14px; align-items: center; flex-wrap: wrap; padding: 14px 16px; background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.range-bar-lbl { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; }

@media(max-width:540px){
  .stats-row.four { grid-template-columns: 1fr 1fr; }
  .page { padding: 12px; }
  .topbar { padding: 10px 12px; }
  .fi { min-width: 0; flex: 1; }
}

/* ── TURNI GRID ── */
.week-nav { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.week-nav-btn { padding:6px 12px; border-radius:8px; border:1.5px solid #e5e7eb; background:#fff; color:#374151; font-family:'Inter',sans-serif; font-size:12px; font-weight:600; cursor:pointer; transition:all .12s; }
.week-nav-btn:hover { background:#f3f4f6; }
.week-label { flex:1; text-align:center; font-size:13px; font-weight:700; color:#111827; }
.turni-scroll { overflow-x:auto; }
.turni-table { width:100%; border-collapse:collapse; font-size:12px; }
.turni-table th { padding:8px 5px; text-align:center; font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.3px; background:#f9fafb; border-bottom:1.5px solid #e5e7eb; white-space:nowrap; }
.turni-table th.emp-col { text-align:left; min-width:110px; }
.turni-table td { padding:4px 3px; border-bottom:1px solid #f3f4f6; vertical-align:middle; }
.turni-table td.emp-cell { text-align:left; font-weight:700; color:#111827; padding:5px 10px; background:#fff; }
.turni-table td.tipo-cell { font-size:10px; font-weight:700; text-align:center; padding:5px 4px; white-space:nowrap; }
.turni-table tr.pranzo-row td:not(.emp-cell) { background:#fefce8; }
.turni-table tr.cena-row td:not(.emp-cell) { background:#eff6ff; border-bottom:3px solid #e5e7eb; }
.turni-select { width:100%; padding:3px 2px; border:1.5px solid #d1d5db; border-radius:5px; font-family:'Inter',sans-serif; font-size:11px; cursor:pointer; min-width:52px; }
.turni-select:focus { outline:none; border-color:#2563eb; }
.turni-badge { display:inline-block; padding:3px 7px; border-radius:5px; font-size:11px; font-weight:700; white-space:nowrap; }
.turni-badge.libre { color:#9ca3af; }
.turni-badge.turno { background:#dcfce7; color:#15803d; }
.turni-badge.ferie { background:#fee2e2; color:#dc2626; }
.turni-note { width:100%; border:1.5px solid #e5e7eb; border-radius:8px; padding:10px 12px; font-family:'Inter',sans-serif; font-size:13px; color:#111827; resize:vertical; min-height:56px; margin-top:12px; }
.turni-note:focus { outline:none; border-color:#2563eb; }
.turni-in-badge { display:inline-block; padding:2px 7px; border-radius:10px; font-size:10px; font-weight:700; background:#ede9fe; color:#7c3aed; margin-left:4px; vertical-align:middle; }
`;

/* ─── AVATARS ────────────────────────────────────────────────────────── */
const AVATARS = ["👨‍💻","👩‍💼","🎨","📊","💼","👩‍🏫","👨‍🔧","👩‍🔬","👨‍🎨","👩‍💻","👷","👩‍⚕️","🧑‍💼","👨‍🏫","👩‍🔧","🧑‍🔬"];
const RUOLI   = ["Boss","Chef","Aiuto Cuoco","Lavapiatti","Pulizia","Cameriere","Banconiere","Pizzaiolo"];
const REPARTI = ["Cucina","Pizzeria","Sala","Banco","Cassa","Pulizie","Lavaggio"];

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

/* ── RIEPILOGO PERIODO ── */
function RiepilogoPeriodo({ records, employees, filterEmpId, from, to }) {
  const [expanded, setExpanded] = useState({});

  const filtered = records.filter(r => {
    if (filterEmpId !== null && r.empId !== filterEmpId) return false;
    if (from) { const f = new Date(from); f.setHours(0,0,0,0); if (r.time < f) return false; }
    if (to)   { const t = new Date(to);   t.setHours(23,59,59,999); if (r.time > t) return false; }
    return true;
  });

  const dayMap = {};
  filtered.forEach(r => {
    const key = fmtD(r.time);
    if (!dayMap[key]) dayMap[key] = { date: r.time, recs: [] };
    dayMap[key].recs.push(r);
  });

  const days = Object.entries(dayMap)
    .sort((a, b) => new Date(b[0].split("/").reverse().join("-")) - new Date(a[0].split("/").reverse().join("-")))
    .map(([key, d]) => {
      const empMap = {};
      d.recs.forEach(r => { if (!empMap[r.empId]) empMap[r.empId] = []; empMap[r.empId].push(r); });
      const r30 = t => { const m=t.getMinutes(), h=t.getHours(); if(m<15) return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h,0,0,0); if(m<45) return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h,30,0,0); return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h+1,0,0,0); };
      let dayTotal = 0;
      Object.values(empMap).forEach(recs => {
        let lastIn = null;
        recs.sort((a,b) => a.time - b.time).forEach(r => {
          if (r.type==="in") lastIn = r.time;
          else if (r.type==="out" && lastIn) { dayTotal += (r30(r.time) - r30(lastIn))/3600000; lastIn = null; }
        });
      });
      return { key, date: d.date, recs: d.recs.sort((a,b) => a.time - b.time), dayTotal: Math.max(0, Math.round(dayTotal*2)/2) };
    });

  const grandTotal = Math.round(days.reduce((s,d) => s+d.dayTotal, 0)*2)/2;
  const toggle = key => setExpanded(p => ({...p, [key]: !p[key]}));

  if (!from && !to) return (
    <div style={{textAlign:"center",padding:"40px 20px",color:"#9ca3af"}}>
      <div style={{fontSize:36,marginBottom:10}}>📅</div>
      <div style={{fontWeight:600,fontSize:14}}>Seleziona un intervallo di date per visualizzare il riepilogo</div>
    </div>
  );

  if (days.length === 0) return (
    <div style={{textAlign:"center",padding:"40px 20px",color:"#9ca3af"}}>
      <div style={{fontSize:36,marginBottom:10}}>📋</div>
      <div style={{fontWeight:600,fontSize:14}}>Nessuna timbratura nel periodo selezionato</div>
    </div>
  );

  return (
    <div>
      {days.map(({key, date, recs, dayTotal}) => (
        <div key={key} className="riep-day-card">
          <div className="riep-day-row">
            <div style={{flex:1}}>
              <div className="riep-day-name">{fmtDateFriendly(date)}</div>
              <div className="riep-day-date">{key}</div>
            </div>
            <div className="riep-day-hours">{dayTotal>0?`${dayTotal}h`:"—"}</div>
            <button className="riep-det-btn" onClick={()=>toggle(key)}>{expanded[key]?"▲ Chiudi":"▼ Dettaglio"}</button>
          </div>
          {expanded[key] && (
            <div className="riep-detail">
              {recs.map(r => {
                const emp = employees?.find(e => e.id===r.empId);
                return (
                  <div key={r.id} className="riep-rec">
                    <div className={`reg-icon ${r.type}`} style={{width:30,height:30,fontSize:14,flexShrink:0}}>{r.type==="in"?"↑":"↓"}</div>
                    <div style={{flex:1}}>
                      {filterEmpId===null && emp && <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:1}}>{emp.avatar} {emp.name}</div>}
                      <div style={{fontSize:13,fontWeight:700,color:r.type==="in"?"#15803d":"#dc2626"}}>{r.type==="in"?"Entrata":"Uscita"}</div>
                      {r.location && r.location!=="Sede principale" && <div style={{fontSize:11,color:"#9ca3af"}}>📍 {r.location}</div>}
                    </div>
                    <div style={{fontWeight:800,fontSize:18,color:"#111827",fontVariantNumeric:"tabular-nums"}}>{fmtT(r.time)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      <div className="riep-total">
        <span style={{fontWeight:700,fontSize:14,color:"#1d4ed8"}}>Totale periodo</span>
        <span className="riep-total-val">{grandTotal}h</span>
      </div>
    </div>
  );
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
function EmployeeScreen({ user, records, onRecord, onLogout, showToast, turni }) {
  const [tab, setTab] = useState("home");
  const [checkedIn, setCheckedIn] = useState(() => isCheckedIn(records, user.id));
  const [now, setNow] = useState(new Date());
  const [regFrom, setRegFrom] = useState(() => { const d=new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [regTo,   setRegTo  ] = useState(() => new Date().toISOString().split("T")[0]);
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const todayRecs = records.filter(r => r.empId===user.id && r.time>=today0());
  const lastIn  = todayRecs.filter(r=>r.type==="in").sort((a,b)=>b.time-a.time)[0];
  const lastOut = todayRecs.filter(r=>r.type==="out").sort((a,b)=>b.time-a.time)[0];

  function roundedHours(inTime, outTime) {
    if (!inTime || !outTime) return null;
    const r30 = t => { const m=t.getMinutes(), h=t.getHours(); if(m<15) return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h,0,0,0); if(m<45) return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h,30,0,0); return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h+1,0,0,0); };
    const diff = (r30(outTime) - r30(inTime)) / 3600000;
    return Math.max(0, Math.round(diff * 2) / 2);
  }

  const handle = () => {
    const type = checkedIn ? "out" : "in";
    setCheckedIn(prev => !prev);
    const rec = { id: Date.now(), empId: user.id, type, time: new Date(), location: "Sede principale" };
    const commit = (finalRec) => { onRecord(finalRec); showToast(type==="in"?"Entrata registrata! 👍":"Uscita registrata! 👋", "ok"); };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => { rec.location = `${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)}`; commit(rec); },
        () => commit(rec), { timeout: 4000 }
      );
    } else commit(rec);
  };

  return (
    <div className="tmb-outer">
      {/* Header */}
      <div className="tmb-header">
        <div className="tmb-brand"><div className="tmb-brand-dot"/>Presenze</div>
        <div className="tmb-tabs">
          <button className={`tmb-tab ${tab==="home"?"active":""}`} onClick={()=>setTab("home")}>⏱ Timbratura</button>
          <button className={`tmb-tab ${tab==="registro"?"active":""}`} onClick={()=>setTab("registro")}>📋 Registro</button>
          {user.in_turni && <button className={`tmb-tab ${tab==="turni"?"active":""}`} onClick={()=>setTab("turni")}>📅 Turni</button>}
        </div>
        <button onClick={onLogout} style={{background:"none",border:"none",fontSize:12,color:"#9ca3af",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:600}}>← Esci</button>
      </div>

      {tab === "home" && (
        <div className="tmb-body">
          <div className="tmb-name">{user.avatar} {user.name}</div>
          <div className="tmb-role">{user.role}{user.dept ? ` · ${user.dept}` : ""}</div>

          {/* Orologio */}
          <div className="tmb-clock-box">
            <div className="tmb-time">{now.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
            <div className="tmb-date">{now.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
            <div className="tmb-status">
              <div className="tmb-sdot" style={{background:checkedIn?"#22c55e":"#ef4444",boxShadow:checkedIn?"0 0 8px #22c55e":"none"}}/>
              <span className="tmb-stxt" style={{color:checkedIn?"#15803d":"#dc2626"}}>{checkedIn?"In sede":"Fuori sede"}</span>
            </div>
          </div>

          {/* Bottoni freccia */}
          <div className="tmb-btn-wrap">
            <button className={`tmb-btn ${!checkedIn?"in":"disabled"}`} onClick={!checkedIn?handle:undefined}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
              START
            </button>
            <button className={`tmb-btn ${checkedIn?"out":"disabled"}`} onClick={checkedIn?handle:undefined}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
              </svg>
              STOP
            </button>
          </div>

          {/* Info entrata/uscita */}
          {checkedIn && lastIn && (
            <div className="tmb-info">
              <div className="tmb-info-row">📅 <span>Entrato il</span> <span className="tmb-info-val">{fmtD(lastIn.time)}</span></div>
              <div className="tmb-info-row">🕐 <span>Orario entrata</span> <span className="tmb-info-val">{fmtT(lastIn.time)}</span></div>
              {lastIn.location && lastIn.location!=="Sede principale" && (
                <div className="tmb-info-row">📍 <a href={`https://maps.google.com/?q=${lastIn.location}`} target="_blank" rel="noreferrer" style={{color:"#2563eb",fontWeight:600,fontSize:12}}>{lastIn.location}</a></div>
              )}
            </div>
          )}
          {!checkedIn && lastOut && (
            <div className="tmb-info">
              <div className="tmb-info-row">🕐 <span>Ultima uscita</span> <span className="tmb-info-val">{fmtT(lastOut.time)}</span></div>
              {lastIn && roundedHours(lastIn.time, lastOut.time) !== null && (
                <div className="tmb-info-row">⏱ <span>Ore lavorate oggi</span> <span className="tmb-info-val" style={{color:"#2563eb"}}>{roundedHours(lastIn.time, lastOut.time)}h</span></div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "registro" && (
        <div className="reg-outer">
          <div className="range-bar">
            <span className="range-bar-lbl">Dal</span>
            <input type="date" className="fi" value={regFrom} onChange={e=>setRegFrom(e.target.value)} style={{flex:"none",width:136}}/>
            <span className="range-bar-lbl">Al</span>
            <input type="date" className="fi" value={regTo}   onChange={e=>setRegTo(e.target.value)}   style={{flex:"none",width:136}}/>
          </div>
          <RiepilogoPeriodo records={records} employees={[]} filterEmpId={user.id} from={regFrom} to={regTo}/>
        </div>
      )}

      {tab === "turni" && user.in_turni && <TurniEmployee user={user} turni={turni}/>}
    </div>
  );
}

/* ── ADMIN DASHBOARD ── */
function AdminDashboard({ records, employees, onRecord, onUpdateRecord }) {
  const [now, setNow] = useState(new Date());
  const [editing, setEditing] = useState(null); // { rec|null, emp, tipo }
  const [editVal, setEditVal] = useState("");
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);

  const toDateTimeLocal = d => {
    const pad = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEdit = (rec, emp, tipo) => {
    setEditVal(toDateTimeLocal(rec ? rec.time : new Date()));
    setEditing({ rec, emp, tipo });
  };

  const saveEdit = () => {
    if (!editVal) return;
    const newTime = new Date(editVal);
    if (isNaN(newTime.getTime())) return;
    if (editing.rec) {
      onUpdateRecord(editing.rec, newTime);
    } else {
      onRecord({ id: Date.now() + editing.emp.id, empId: editing.emp.id, type: editing.tipo, time: newTime, location: "Admin (manuale)" });
    }
    setEditing(null);
  };

  const punch = (emp, type) => {
    const rec = { id: Date.now() + emp.id, empId: emp.id, type, time: new Date(), location: "Admin" };
    onRecord(rec);
  };

  const editBtn = (rec, emp, tipo) => (
    <button onClick={()=>openEdit(rec, emp, tipo)}
      style={{background:"none",border:"none",cursor:"pointer",padding:"2px 5px",borderRadius:5,fontSize:13,color:"#9ca3af",lineHeight:1,transition:"all .1s"}}
      title="Modifica orario"
    >✏</button>
  );

  return <>
    <div style={{fontWeight:800,fontSize:20,color:"#111827",marginBottom:16,letterSpacing:"-.3px"}}>
      Dashboard · <span style={{fontWeight:500,fontSize:15,color:"#6b7280"}}>{now.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
      {[...employees].sort((a,b) => isCheckedIn(records,b.id) - isCheckedIn(records,a.id)).map(emp => {
        const todayRecs = records.filter(r => r.empId===emp.id && r.time>=today0()).sort((a,b)=>a.time-b.time);
        const ci = todayRecs.length > 0 && todayRecs[todayRecs.length-1].type === "in";
        const lastIn  = [...todayRecs].filter(r=>r.type==="in").pop();
        const lastOut = [...todayRecs].filter(r=>r.type==="out").pop();
        const mins = lastIn && ci ? Math.floor((now - lastIn.time)/60000) : null;

        return (
          <div key={emp.id} style={{background:"#fff",borderRadius:20,padding:"20px 18px",boxShadow:"0 2px 12px rgba(0,0,0,.07),0 0 0 1px rgba(0,0,0,.04)",display:"flex",flexDirection:"column",gap:0,borderTop:`3px solid ${ci?"#22c55e":"#e5e7eb"}`}}>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{fontSize:36,lineHeight:1}}>{emp.avatar}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:16,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{emp.name}</div>
                <div style={{fontSize:12,color:"#9ca3af",marginTop:1}}>{emp.role}</div>
              </div>
              <span className={`badge ${ci?"in":"out"}`}><span className="bd"/>{ci?"In sede":"Fuori"}</span>
            </div>

            {/* Orari */}
            <div style={{background:"#f9fafb",borderRadius:12,padding:"10px 14px",marginBottom:14,minHeight:52,display:"flex",flexDirection:"column",justifyContent:"center",gap:5}}>
              {!lastIn && !lastOut && (
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:12,color:"#9ca3af",fontWeight:500,marginBottom:6}}>Nessuna timbratura oggi</div>
                  <button onClick={()=>openEdit(null,emp,"in")} style={{fontSize:11,color:"#2563eb",background:"none",border:"1.5px solid #bfdbfe",borderRadius:7,padding:"3px 12px",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:700}}>+ Aggiungi entrata</button>
                </div>
              )}
              {lastIn && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>
                  <span style={{fontSize:12,color:"#6b7280",fontWeight:500}}>Entrata</span>
                  <span style={{fontWeight:800,fontSize:16,color:"#111827",marginLeft:"auto",fontVariantNumeric:"tabular-nums"}}>{fmtT(lastIn.time)}</span>
                  {editBtn(lastIn,emp,"in")}
                </div>
              )}
              {lastOut && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",flexShrink:0}}/>
                  <span style={{fontSize:12,color:"#6b7280",fontWeight:500}}>Uscita</span>
                  <span style={{fontWeight:800,fontSize:16,color:"#111827",marginLeft:"auto",fontVariantNumeric:"tabular-nums"}}>{fmtT(lastOut.time)}</span>
                  {editBtn(lastOut,emp,"out")}
                </div>
              )}
              {ci && mins !== null && (
                <div style={{fontSize:11,color:"#9ca3af",textAlign:"right",marginTop:2}}>
                  In sede da {Math.floor(mins/60)}h {mins%60}m
                </div>
              )}
            </div>

            {/* Bottoni */}
            <div style={{display:"flex",gap:10}}>
              <button
                onClick={()=>!ci && punch(emp,"in")}
                style={{flex:1,height:52,borderRadius:14,border:"none",cursor:ci?"default":"pointer",fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all .15s",background:ci?"#d1fae5":"linear-gradient(135deg,#22c55e,#16a34a)",boxShadow:ci?"none":"0 4px 14px rgba(34,197,94,.35)",opacity:ci?0.5:1}}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                Entrata
              </button>
              <button
                onClick={()=>ci && punch(emp,"out")}
                style={{flex:1,height:52,borderRadius:14,border:"none",cursor:ci?"pointer":"default",fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all .15s",background:ci?"linear-gradient(135deg,#ef4444,#dc2626)":"#fee2e2",boxShadow:ci?"0 4px 14px rgba(239,68,68,.35)":"none",opacity:ci?1:0.5}}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                Uscita
              </button>
            </div>
          </div>
        );
      })}
    </div>

    {editing && (
      <div className="modal-ov" onClick={e=>e.target===e.currentTarget&&setEditing(null)}>
        <div className="modal-box" style={{maxWidth:320}}>
          <div className="modal-title">{editing.rec?"✏️ Modifica orario":"➕ Aggiungi timbratura"}</div>
          <div style={{fontSize:13,color:"#6b7280",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>{editing.emp.avatar}</span>
            <span style={{fontWeight:600}}>{editing.emp.name}</span>
            <span style={{background:editing.tipo==="in"?"#dcfce7":"#fee2e2",color:editing.tipo==="in"?"#15803d":"#dc2626",padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:700,marginLeft:"auto"}}>
              {editing.tipo==="in"?"▲ Entrata":"▼ Uscita"}
            </span>
          </div>
          <div className="f-field">
            <span className="f-lbl">Data e ora</span>
            <input type="datetime-local" className="f-inp" value={editVal} onChange={e=>setEditVal(e.target.value)}/>
          </div>
          <div className="modal-btns">
            <button className="m-btn cx" onClick={()=>setEditing(null)}>Annulla</button>
            <button className="m-btn ok" onClick={saveEdit}>Salva</button>
          </div>
        </div>
      </div>
    )}
  </>;
}

/* ── ADMIN REGISTRO ── */
function AdminRegistro({ records, employees }) {
  const [empF,  setEmpF]  = useState("all");
  const [rFrom, setRFrom] = useState(() => { const d=new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [rTo,   setRTo]   = useState(() => new Date().toISOString().split("T")[0]);

  return <>
    <div style={{fontWeight:800,fontSize:20,color:"#111827",marginBottom:14,letterSpacing:"-.3px"}}>Registro Timbrature</div>
    <div className="range-bar">
      <select className="fi" value={empF} onChange={e=>setEmpF(e.target.value)}>
        <option value="all">Tutti i dipendenti</option>
        {employees.map(e=><option key={e.id} value={e.id}>{e.avatar} {e.name}</option>)}
      </select>
      <span className="range-bar-lbl">Dal</span>
      <input type="date" className="fi" value={rFrom} onChange={e=>setRFrom(e.target.value)} style={{flex:"none",width:136}}/>
      <span className="range-bar-lbl">Al</span>
      <input type="date" className="fi" value={rTo}   onChange={e=>setRTo(e.target.value)}   style={{flex:"none",width:136}}/>
    </div>
    <RiepilogoPeriodo records={records} employees={employees} filterEmpId={empF==="all"?null:Number(empF)} from={rFrom} to={rTo}/>
  </>;
}

/* ── EMPLOYEE MODAL ── */
function EmpModal({ emp, onSave, onClose }) {
  const isNew = !emp;
  const [f, setF] = useState(emp?{...emp}:{name:"",role:"",dept:"",pin:"",email:"",phone:"",avatar:"👤",target:8,color:"#2563eb",in_turni:false});
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
          <div className="f-field"><span className="f-lbl">Ruolo</span>
            <select className="f-inp" value={f.role} onChange={e=>set("role",e.target.value)} style={{cursor:"pointer"}}>
              <option value="">— Seleziona ruolo —</option>
              {RUOLI.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="f-field"><span className="f-lbl">Reparto</span>
            <select className="f-inp" value={f.dept} onChange={e=>set("dept",e.target.value)} style={{cursor:"pointer"}}>
              <option value="">— Seleziona reparto —</option>
              {REPARTI.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="f-row">
          <div className="f-field"><span className="f-lbl">Email</span><input className="f-inp" type="email" value={f.email} onChange={e=>set("email",e.target.value)} placeholder="m@azienda.it"/></div>
          <div className="f-field"><span className="f-lbl">Telefono</span><input className="f-inp" value={f.phone} onChange={e=>set("phone",e.target.value)} placeholder="333 0000000"/></div>
        </div>
        <div className="f-field"><span className="f-lbl">Colore accento</span><input className="f-inp" type="color" value={f.color} onChange={e=>set("color",e.target.value)} style={{height:38,padding:"3px 6px",cursor:"pointer"}}/></div>
        <div className="f-field">
          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none",padding:"10px 12px",background:f.in_turni?"#ede9fe":"#f9fafb",border:`1.5px solid ${f.in_turni?"#c4b5fd":"#e5e7eb"}`,borderRadius:9,transition:"all .12s"}}>
            <input type="checkbox" checked={!!f.in_turni} onChange={e=>set("in_turni",e.target.checked)} style={{width:16,height:16,cursor:"pointer",accentColor:"#7c3aed"}}/>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>Includi nei Turni</div>
              <div style={{fontSize:11,color:"#9ca3af"}}>Il dipendente apparirà nella griglia turni</div>
            </div>
          </label>
        </div>
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
    const r30 = t => { const m=t.getMinutes(), h=t.getHours(); if(m<15) return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h,0,0,0); if(m<45) return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h,30,0,0); return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h+1,0,0,0); };
    const days = {};
    let lastIn = null;
    recs.forEach(r => {
      const day = fmtD(r.time);
      if (!days[day]) days[day] = { inTime: null, outTime: null, hours: 0, entries: [] };
      days[day].entries.push(r);
      if (r.type==="in") { lastIn = r.time; if (!days[day].inTime) days[day].inTime = r.time; }
      else if (r.type==="out" && lastIn) {
        days[day].hours += (r30(r.time) - r30(lastIn)) / 3600000;
        days[day].outTime = r.time;
        lastIn = null;
      }
    });
    Object.values(days).forEach(d => { d.hours = Math.max(0, Math.round(d.hours*2)/2); });
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
              <div style={{marginTop:4,display:"flex",gap:4,flexWrap:"wrap"}}>
                <span className={`badge ${ci?"in":"out"}`}><span className="bd"/>{ci?"In sede":"Assente"}</span>
                {emp.in_turni && <span className="turni-in-badge">Turni</span>}
              </div>
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

/* ── ADMIN PDF ── */
function AdminPDF({ records, employees }) {
  const [from, setFrom] = useState(() => { const d=new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [to,   setTo  ] = useState(() => new Date().toISOString().split("T")[0]);
  const [selEmps, setSelEmps] = useState(() => new Set(employees.map(e => e.id)));

  const toggleEmp = id => setSelEmps(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  const r30 = t => { const m=t.getMinutes(), h=t.getHours(); if(m<15) return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h,0,0,0); if(m<45) return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h,30,0,0); return new Date(t.getFullYear(),t.getMonth(),t.getDate(),h+1,0,0,0); };

  const generate = () => {
    if (!from || !to || selEmps.size === 0) return;
    const fromD = new Date(from); fromD.setHours(0,0,0,0);
    const toD   = new Date(to);   toD.setHours(23,59,59,999);

    const empData = employees.filter(e => selEmps.has(e.id)).map(emp => {
      const empRecs = records.filter(r => r.empId===emp.id && r.time>=fromD && r.time<=toD).sort((a,b)=>a.time-b.time);
      const dayMap = {};
      let lastIn = null;
      empRecs.forEach(r => {
        const day = fmtD(r.time);
        if (!dayMap[day]) dayMap[day] = { hours: 0 };
        if (r.type==="in") lastIn = r.time;
        else if (r.type==="out" && lastIn) { dayMap[day].hours += (r30(r.time)-r30(lastIn))/3600000; lastIn=null; }
      });
      const days = Object.entries(dayMap)
        .sort((a,b) => new Date(a[0].split("/").reverse().join("-")) - new Date(b[0].split("/").reverse().join("-")))
        .map(([day,d]) => ({day, hours: Math.max(0, Math.round(d.hours*2)/2)}));
      const total = Math.round(days.reduce((s,d)=>s+d.hours,0)*2)/2;
      return { emp, days, total };
    });

    const fromFmt = new Date(from).toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"});
    const toFmt   = new Date(to).toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"});

    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><title>Report Presenze</title><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;padding:28px 32px}
h1{font-size:22px;font-weight:800;color:#1d4ed8;margin-bottom:4px}
.period{font-size:13px;color:#555;margin-bottom:32px}
.emp-section{margin-bottom:36px;page-break-inside:avoid}
.emp-name{font-size:15px;font-weight:700;color:#1e40af;padding-bottom:6px;border-bottom:2px solid #2563eb;margin-bottom:4px}
.emp-meta{font-size:11px;color:#888;margin-bottom:10px}
table{width:100%;border-collapse:collapse}
th{background:#f3f4f6;padding:7px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#666;border-bottom:2px solid #e5e7eb}
td{padding:7px 14px;border-bottom:1px solid #f3f4f6;font-size:12px}
.h-col{text-align:right;font-weight:600;color:#1d4ed8}
.tot-row td{font-weight:700;background:#eff6ff;border-top:2px solid #bfdbfe;border-bottom:none;color:#1d4ed8;padding:9px 14px}
.no-data{color:#aaa;font-style:italic;padding:8px 0;font-size:11px}
@media print{body{padding:16px}.emp-section{page-break-inside:avoid}}
</style></head><body>
<h1>Report Presenze</h1>
<div class="period">Periodo: <strong>${fromFmt}</strong> — <strong>${toFmt}</strong></div>
${empData.map(({emp,days,total})=>`
<div class="emp-section">
<div class="emp-name">${emp.name}</div>
<div class="emp-meta">${[emp.role,emp.dept].filter(Boolean).join(" · ")}</div>
${days.length===0
  ?'<div class="no-data">Nessuna timbratura nel periodo</div>'
  :`<table><thead><tr><th>Giorno</th><th style="text-align:right">Ore lavorate</th></tr></thead><tbody>
${days.map(d=>`<tr><td>${d.day}</td><td class="h-col">${d.hours>0?d.hours+"h":"—"}</td></tr>`).join("")}
<tr class="tot-row"><td>Totale periodo</td><td class="h-col">${total}h</td></tr>
</tbody></table>`}
</div>`).join("")}
</body></html>`;

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(()=>win.print(), 250);
  };

  const canGenerate = from && to && selEmps.size > 0;

  return <>
    <div style={{fontWeight:800,fontSize:20,color:"#111827",marginBottom:14,letterSpacing:"-.3px"}}>Esporta PDF</div>

    <div className="range-bar" style={{marginBottom:16}}>
      <span className="range-bar-lbl">Dal</span>
      <input type="date" className="fi" value={from} onChange={e=>setFrom(e.target.value)} style={{flex:"none",width:136}}/>
      <span className="range-bar-lbl">Al</span>
      <input type="date" className="fi" value={to}   onChange={e=>setTo(e.target.value)}   style={{flex:"none",width:136}}/>
    </div>

    <div style={{background:"#fff",borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)",padding:"16px",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:12,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:".5px"}}>Dipendenti</span>
        <div style={{display:"flex",gap:8}}>
          <button className="fi-btn sec" style={{fontSize:11,padding:"5px 10px"}} onClick={()=>setSelEmps(new Set(employees.map(e=>e.id)))}>Tutti</button>
          <button className="fi-btn sec" style={{fontSize:11,padding:"5px 10px"}} onClick={()=>setSelEmps(new Set())}>Nessuno</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:8}}>
        {employees.map(e=>(
          <label key={e.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:selEmps.has(e.id)?"#eff6ff":"#f9fafb",border:`1.5px solid ${selEmps.has(e.id)?"#bfdbfe":"#e5e7eb"}`,borderRadius:9,cursor:"pointer",transition:"all .12s",userSelect:"none"}}>
            <input type="checkbox" checked={selEmps.has(e.id)} onChange={()=>toggleEmp(e.id)} style={{width:16,height:16,cursor:"pointer",accentColor:"#2563eb"}}/>
            <span style={{fontSize:18,flexShrink:0}}>{e.avatar}</span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:"#111827",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.name}</div>
              <div style={{fontSize:11,color:"#9ca3af"}}>{e.dept}</div>
            </div>
          </label>
        ))}
      </div>
    </div>

    <button onClick={generate} disabled={!canGenerate} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:canGenerate?"#2563eb":"#e5e7eb",color:canGenerate?"#fff":"#9ca3af",fontFamily:"Inter,sans-serif",fontSize:15,fontWeight:700,cursor:canGenerate?"pointer":"default",transition:"all .15s"}}>
      📄 Genera PDF {canGenerate?`(${selEmps.size} dipendent${selEmps.size===1?"e":"i"})`:""}
    </button>
  </>;
}

/* ── ADMIN ORARIO MANUALE ── */
function AdminOrarioManuale({ employees }) {
  const LS_KEY = "presenze_orari_manuali";
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };

  const [entries, setEntries] = useState(load);
  const [empId, setEmpId] = useState(null);
  const [viewMode, setViewMode] = useState("mese");
  const [month, setMonth] = useState(() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; });
  const [from, setFrom] = useState(() => { const d=new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({ data: new Date().toISOString().split("T")[0], ore: "" });
  const [editing, setEditing] = useState(null);

  useEffect(() => { if (!empId && employees.length > 0) setEmpId(employees[0].id); }, [employees, empId]);

  const persist = d => { setEntries(d); localStorage.setItem(LS_KEY, JSON.stringify(d)); };

  const filtered = entries.filter(e => {
    if (e.empId !== empId) return false;
    if (viewMode === "mese") return e.data.startsWith(month);
    return e.data >= from && e.data <= to;
  }).sort((a, b) => a.data.localeCompare(b.data));

  const total = filtered.reduce((s, e) => s + (Number(e.ore) || 0), 0);

  const fmtOre = n => { const h=Math.floor(n), m=Math.round((n-h)*60); return m>0?`${h}h ${m}m`:`${h}h`; };

  const monthLabel = () => {
    const [y, m] = month.split("-");
    return new Date(y, m-1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  };
  const shiftMonth = delta => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m-1+delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };

  const addEntry = () => {
    if (!form.data || !form.ore || !empId) return;
    persist([...entries, { id: Date.now().toString(), empId, data: form.data, ore: Number(form.ore) }]);
    setForm(f => ({ ...f, ore: "" }));
  };
  const deleteEntry = id => persist(entries.filter(e => e.id !== id));
  const commitEdit = () => {
    if (!editing) return;
    persist(entries.map(e => e.id === editing.id ? { ...e, ore: Number(editing.ore) } : e));
    setEditing(null);
  };

  const inp = { padding:"8px 10px", borderRadius:8, border:"1.5px solid #e5e7eb", fontFamily:"Inter,sans-serif", fontSize:13 };
  const lbl = { fontSize:11, fontWeight:600, color:"#6b7280", display:"block", marginBottom:4 };

  return <>
    <div style={{fontWeight:800,fontSize:20,color:"#111827",marginBottom:16,letterSpacing:"-.3px"}}>Orario manuale</div>

    <div className="card" style={{padding:16,marginBottom:12}}>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div>
          <label style={lbl}>DIPENDENTE</label>
          <select value={empId ?? ""} onChange={e => setEmpId(Number(e.target.value))}
            style={{...inp,fontWeight:600,color:"#111827",background:"#fff"}}>
            {employees.map(e => <option key={e.id} value={e.id}>{e.avatar} {e.name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>PERIODO</label>
          <div style={{display:"flex",gap:4}}>
            {["mese","intervallo"].map(v => (
              <button key={v} onClick={()=>setViewMode(v)} style={{padding:"8px 14px",borderRadius:8,border:"1.5px solid",borderColor:viewMode===v?"#2563eb":"#e5e7eb",background:viewMode===v?"#eff6ff":"#fff",color:viewMode===v?"#2563eb":"#6b7280",fontFamily:"Inter,sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>
                {v==="mese"?"Mese":"Intervallo"}
              </button>
            ))}
          </div>
        </div>
        {viewMode === "mese" ? (
          <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
            <button onClick={()=>shiftMonth(-1)} style={{...inp,cursor:"pointer",padding:"8px 12px"}}>←</button>
            <span style={{fontSize:15,fontWeight:700,color:"#111827",minWidth:150,textAlign:"center",paddingBottom:8,textTransform:"capitalize"}}>{monthLabel()}</span>
            <button onClick={()=>shiftMonth(1)}  style={{...inp,cursor:"pointer",padding:"8px 12px"}}>→</button>
          </div>
        ) : (
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div><label style={lbl}>DAL</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={inp}/></div>
            <div><label style={lbl}>AL</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} style={inp}/></div>
          </div>
        )}
      </div>
    </div>

    <div style={{display:"flex",gap:10,marginBottom:12}}>
      {[
        ["Giorni",   filtered.length,        "#111827", false],
        ["Totale ore", fmtOre(total),         "#2563eb", false],
        ["Media/giorno", filtered.length ? fmtOre(Math.round(total/filtered.length*10)/10) : "—", "#059669", false],
      ].map(([label,val,color]) => (
        <div key={label} className="card" style={{padding:"12px 18px",flex:1,textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>{label}</div>
          <div style={{fontSize:26,fontWeight:800,color,fontVariantNumeric:"tabular-nums"}}>{val}</div>
        </div>
      ))}
    </div>

    <div className="card" style={{padding:14,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:700,color:"#6b7280",marginBottom:10,textTransform:"uppercase",letterSpacing:".4px"}}>Aggiungi giorno</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div><label style={lbl}>DATA</label><input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={inp}/></div>
        <div>
          <label style={lbl}>ORE LAVORATE</label>
          <input type="number" min="0" max="24" step="0.5" placeholder="es. 8 o 7.5"
            value={form.ore} onChange={e=>setForm(f=>({...f,ore:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&addEntry()}
            style={{...inp,width:130}}/>
        </div>
        <button onClick={addEntry} disabled={!form.data||!form.ore||!empId}
          style={{padding:"9px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",opacity:(!form.data||!form.ore||!empId)?0.45:1}}>
          + Aggiungi
        </button>
      </div>
    </div>

    <div className="table-wrap">
      {filtered.length === 0 ? (
        <div style={{padding:"36px",textAlign:"center",color:"#9ca3af"}}>
          <div style={{fontSize:32,marginBottom:8}}>📋</div>
          <div style={{fontWeight:600,fontSize:14}}>Nessun orario inserito per questo periodo</div>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              {["Data","Giorno","Ore",""].map(h => (
                <th key={h} style={{textAlign:h==="Ore"?"center":h===""?"right":"left",padding:"10px 16px",fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:".4px",borderBottom:"1px solid #f3f4f6"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => {
              const d = new Date(e.data + "T00:00:00");
              const isEditing = editing?.id === e.id;
              return (
                <tr key={e.id} style={{borderBottom:"1px solid #f9fafb"}}>
                  <td style={{padding:"10px 16px",fontVariantNumeric:"tabular-nums",fontWeight:600,color:"#111827"}}>
                    {d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit",year:"numeric"})}
                  </td>
                  <td style={{padding:"10px 16px",color:"#6b7280",fontSize:13,textTransform:"capitalize"}}>
                    {d.toLocaleDateString("it-IT",{weekday:"long"})}
                  </td>
                  <td style={{padding:"10px 16px",textAlign:"center"}}>
                    {isEditing ? (
                      <input type="number" min="0" max="24" step="0.5" value={editing.ore}
                        onChange={ev=>setEditing(ed=>({...ed,ore:ev.target.value}))}
                        onKeyDown={ev=>{if(ev.key==="Enter")commitEdit();if(ev.key==="Escape")setEditing(null);}}
                        autoFocus
                        style={{width:70,padding:"4px 8px",borderRadius:6,border:"1.5px solid #2563eb",textAlign:"center",fontFamily:"Inter,sans-serif",fontSize:14,fontWeight:700}}/>
                    ) : (
                      <span style={{fontWeight:700,color:"#2563eb",fontSize:15,fontVariantNumeric:"tabular-nums"}}>{fmtOre(e.ore)}</span>
                    )}
                  </td>
                  <td style={{padding:"10px 16px",textAlign:"right"}}>
                    <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                      {isEditing ? (
                        <>
                          <button onClick={commitEdit} style={{padding:"4px 10px",borderRadius:6,border:"none",background:"#dcfce7",color:"#16a34a",fontWeight:700,fontSize:12,cursor:"pointer"}}>✓</button>
                          <button onClick={()=>setEditing(null)} style={{padding:"4px 10px",borderRadius:6,border:"none",background:"#f3f4f6",color:"#6b7280",fontWeight:700,fontSize:12,cursor:"pointer"}}>✕</button>
                        </>
                      ) : (
                        <>
                          <button onClick={()=>setEditing({id:e.id,ore:String(e.ore)})} style={{padding:"4px 10px",borderRadius:6,border:"none",background:"#eff6ff",color:"#2563eb",fontWeight:700,fontSize:12,cursor:"pointer"}}>✏️</button>
                          <button onClick={()=>deleteEntry(e.id)} style={{padding:"4px 10px",borderRadius:6,border:"none",background:"#fef2f2",color:"#dc2626",fontWeight:700,fontSize:12,cursor:"pointer"}}>🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{padding:"10px 16px",fontWeight:700,color:"#111827",borderTop:"2px solid #e5e7eb"}}>Totale</td>
              <td style={{padding:"10px 16px",textAlign:"center",fontWeight:800,color:"#2563eb",fontSize:16,borderTop:"2px solid #e5e7eb",fontVariantNumeric:"tabular-nums"}}>{fmtOre(total)}</td>
              <td style={{borderTop:"2px solid #e5e7eb"}}/>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  </>;
}

/* ── TURNI ADMIN (sola lettura — gestione su Turni Arcobaleno) ── */
function TurniAdmin({ employees, turni }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const turniEmps = employees.filter(e => e.in_turni);
  const days = Array.from({length:7}, (_,i) => { const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });

  const prevWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  const nextWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
  const weekLabel = `${weekStart.toLocaleDateString("it-IT",{day:"2-digit",month:"long"})} – ${weekEnd.toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"})}`;

  return <>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <div style={{fontWeight:800,fontSize:20,color:"#111827",letterSpacing:"-.3px"}}>Turni</div>
      <a href="https://turni-arcobaleno.vercel.app" target="_blank" rel="noreferrer"
        style={{fontSize:12,fontWeight:600,color:"#2563eb",textDecoration:"none",padding:"6px 12px",border:"1.5px solid #bfdbfe",borderRadius:8,background:"#eff6ff"}}>
        ✏️ Modifica su Turni Arcobaleno →
      </a>
    </div>
    <div className="week-nav">
      <button className="week-nav-btn" onClick={prevWeek}>← Prec</button>
      <div className="week-label">{weekLabel}</div>
      <button className="week-nav-btn" onClick={nextWeek}>Succ →</button>
    </div>
    {turniEmps.length === 0 ? (
      <div style={{textAlign:"center",padding:"40px 20px",color:"#9ca3af"}}>
        <div style={{fontSize:36,marginBottom:10}}>📅</div>
        <div style={{fontWeight:600,fontSize:14}}>Nessun dipendente collegato ai turni.<br/>Attiva "Includi nei Turni" nel pannello Dipendenti e assicurati che il nome corrisponda esattamente a quello su Turni Arcobaleno.</div>
      </div>
    ) : (
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div className="turni-scroll">
          <table className="turni-table">
            <thead>
              <tr>
                <th className="emp-col">Dipendente</th>
                <th style={{minWidth:36,width:36}}>T</th>
                {days.map(d=><th key={toDateStr(d)} style={{minWidth:68}}>
                  {d.toLocaleDateString("it-IT",{weekday:"short"}).toUpperCase()} {d.getDate()}
                </th>)}
              </tr>
            </thead>
            <tbody>
              {turniEmps.map(emp=>[
                <tr key={`${emp.id}-p`} className="pranzo-row">
                  <td className="emp-cell" rowSpan={2} style={{verticalAlign:"middle"}}>{emp.avatar} {emp.name}</td>
                  <td className="tipo-cell" style={{color:"#854d0e"}}>☀<br/>P</td>
                  {days.map(d=>{
                    const ds=toDateStr(d); const val=turni[`${emp.name}::${ds}::pranzo`]||"";
                    const label=shiftLabel("pranzo",val);
                    return <td key={ds} style={{textAlign:"center",padding:"5px 3px"}}>
                      <span className={`turni-badge ${val==="F"?"ferie":val?"turno":"libre"}`}>{label}</span>
                    </td>;
                  })}
                </tr>,
                <tr key={`${emp.id}-c`} className="cena-row">
                  <td className="tipo-cell" style={{color:"#1d4ed8"}}>🌙<br/>C</td>
                  {days.map(d=>{
                    const ds=toDateStr(d); const val=turni[`${emp.name}::${ds}::cena`]||"";
                    const label=shiftLabel("cena",val);
                    return <td key={ds} style={{textAlign:"center",padding:"5px 3px"}}>
                      <span className={`turni-badge ${val==="F"?"ferie":val?"turno":"libre"}`}>{label}</span>
                    </td>;
                  })}
                </tr>
              ])}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </>;
}

/* ── TURNI EMPLOYEE ── */
function TurniEmployee({ user, turni }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const days = Array.from({length:7}, (_,i) => { const d=new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });

  const prevWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  const nextWeek = () => { const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
  const weekLabel = `${weekStart.toLocaleDateString("it-IT",{day:"2-digit",month:"long"})} – ${weekEnd.toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"})}`;

  return (
    <div className="reg-outer">
      <div className="week-nav">
        <button className="week-nav-btn" onClick={prevWeek}>← Prec</button>
        <div className="week-label">{weekLabel}</div>
        <button className="week-nav-btn" onClick={nextWeek}>Succ →</button>
      </div>
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div className="turni-scroll">
          <table className="turni-table">
            <thead>
              <tr>
                <th style={{minWidth:60,textAlign:"left",paddingLeft:10}}>Turno</th>
                {days.map(d=><th key={toDateStr(d)} style={{minWidth:68}}>
                  {d.toLocaleDateString("it-IT",{weekday:"short"}).toUpperCase()} {d.getDate()}
                </th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="pranzo-row">
                <td className="tipo-cell" style={{color:"#854d0e",textAlign:"left",paddingLeft:10}}>☀ Pranzo</td>
                {days.map(d=>{
                  const ds=toDateStr(d); const val=turni[`${user.name}::${ds}::pranzo`]||"";
                  const label=shiftLabel("pranzo",val);
                  return <td key={ds} style={{textAlign:"center",padding:"6px 3px"}}>
                    <span className={`turni-badge ${val==="F"?"ferie":val?"turno":"libre"}`}>{label}</span>
                  </td>;
                })}
              </tr>
              <tr className="cena-row">
                <td className="tipo-cell" style={{color:"#1d4ed8",textAlign:"left",paddingLeft:10}}>🌙 Cena</td>
                {days.map(d=>{
                  const ds=toDateStr(d); const val=turni[`${user.name}::${ds}::cena`]||"";
                  const label=shiftLabel("cena",val);
                  return <td key={ds} style={{textAlign:"center",padding:"6px 3px"}}>
                    <span className={`turni-badge ${val==="F"?"ferie":val?"turno":"libre"}`}>{label}</span>
                  </td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── ADMIN SHELL ── */
function AdminShell({ employees, records, setRecords, onLogout, onAdd, onEdit, onDelete, turni, onRecord, onUpdateRecord }) {
  const [tab, setTab] = useState("dashboard");
  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand"><div className="topbar-brand-dot"/>Presenze</div>
          <div className="tab-nav">
            {[["dashboard","Dashboard"],["registro","Registro"],["dipendenti","Dipendenti"],["turni","Turni"],["pdf","PDF"],["orario","Orario manuale"]].map(([id,l])=>(
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
        {tab==="dashboard"  && <AdminDashboard records={records} employees={employees} onRecord={onRecord} onUpdateRecord={onUpdateRecord}/>}
        {tab==="registro"   && <AdminRegistro  records={records} employees={employees}/>}
        {tab==="dipendenti" && <AdminDipendenti employees={employees} records={records} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}/>}
        {tab==="turni"      && <TurniAdmin employees={employees} turni={turni}/>}
        {tab==="pdf"        && <AdminPDF        records={records} employees={employees}/>}
        {tab==="orario"     && <AdminOrarioManuale employees={employees}/>}
      </div>
    </div>
  );
}

/* ─── ROOT ───────────────────────────────────────────────────────────── */
export default function App() {
  const [employees, setEmployees] = useState([]);
  const [records,   setRecords  ] = useState([]);
  const [turni,     setTurni    ] = useState({});
  const [loading,   setLoading  ] = useState(true);
  const [user,      setUser     ] = useState(null);
  const [toast,     setToast    ] = useState(null);

  // Load all data on startup
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [emps, recs, trn] = await Promise.all([
          dbLoadEmployees(), dbLoadRecords(), dbLoadTurniEsterni()
        ]);
        if (emps) setEmployees(emps);
        if (recs) setRecords(recs);
        setTurni(trn || {});
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const showToast = (msg, type="ok") => setToast({msg, type, k: Date.now()});

  const addRecord = async (rec) => {
    setRecords(p => [rec, ...p]);
    const result = await dbInsertRecord(rec);
    // Supabase può assegnare un id diverso dal nostro temporaneo: sincronizziamo
    if (result?.[0]) {
      const realId = result[0].id;
      setRecords(p => p.map(r => r.id === rec.id ? {...r, id: realId} : r));
    }
  };

  const updateRecord = async (rec, newTime) => {
    setRecords(p => p.map(r => r.id===rec.id ? {...r, time: newTime} : r));
    await dbUpdateRecordTime(rec, newTime);
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
          turni={turni} onRecord={addRecord} onUpdateRecord={updateRecord}
        />
      )}

      {user && !user.isAdmin && (
        <EmployeeScreen
          key={user.id}
          user={user} records={records}
          onRecord={addRecord}
          onLogout={()=>setUser(null)}
          showToast={showToast}
          turni={turni}
        />
      )}

      {toast && <Toast key={toast.k} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
