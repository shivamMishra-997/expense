import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "food",      label: "Food & dining",   icon: "ti-tools-kitchen-2", color: "#1D9E75", bg: "#E1F5EE" },
  { id: "shopping",  label: "Shopping",         icon: "ti-shopping-bag",    color: "#534AB7", bg: "#EEEDFE" },
  { id: "transport", label: "Transport",         icon: "ti-car",             color: "#D85A30", bg: "#FAECE7" },
  { id: "bills",     label: "Bills & utilities", icon: "ti-bolt",            color: "#BA7517", bg: "#FAEEDA" },
  { id: "health",    label: "Health",            icon: "ti-heart-rate-monitor",color: "#A32D2D",bg: "#FCEBEB" },
  { id: "leisure",   label: "Leisure",           icon: "ti-device-gamepad",  color: "#D4537E", bg: "#FBEAF0" },
  { id: "income",    label: "Income",            icon: "ti-coin",            color: "#0F6E56", bg: "#E1F5EE" },
  { id: "other",     label: "Other",             icon: "ti-dots",            color: "#888780", bg: "#F1EFE8" },
];
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const fmt = n => "₹" + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtSigned = n => (n >= 0 ? "+" : "−") + fmt(n);

const today = () => new Date().toISOString().slice(0, 10);
const monthKey = (d) => d.slice(0, 7);
const currentMonth = () => today().slice(0, 7);

function uid() { return Math.random().toString(36).slice(2, 10); }

const SEED_EXPENSES = [
  { id: uid(), amount: 380,  description: "Swiggy – Dinner",         category: "food",      date: today(), notes: "" },
  { id: uid(), amount: 74,   description: "Rapido ride",              category: "transport", date: today(), notes: "" },
  { id: uid(), amount: 1299, description: "Ajio – Kurta Set",         category: "shopping",  date: (() => { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })(), notes: "" },
  { id: uid(), amount: 1140, description: "DGVCL Electricity",        category: "bills",     date: (() => { const d=new Date(); d.setDate(d.getDate()-3); return d.toISOString().slice(0,10); })(), notes: "" },
  { id: uid(), amount: 299,  description: "Jio recharge",             category: "bills",     date: (() => { const d=new Date(); d.setDate(d.getDate()-3); return d.toISOString().slice(0,10); })(), notes: "" },
  { id: uid(), amount: 8000, description: "Freelance payment",        category: "income",    date: (() => { const d=new Date(); d.setDate(d.getDate()-5); return d.toISOString().slice(0,10); })(), notes: "Client project" },
  { id: uid(), amount: 550,  description: "Zomato – Lunch",           category: "food",      date: (() => { const d=new Date(); d.setDate(d.getDate()-2); return d.toISOString().slice(0,10); })(), notes: "" },
  { id: uid(), amount: 2400, description: "Amazon – Headphones",      category: "shopping",  date: (() => { const d=new Date(); d.setDate(d.getDate()-6); return d.toISOString().slice(0,10); })(), notes: "" },
  { id: uid(), amount: 350,  description: "Pharmacy",                 category: "health",    date: (() => { const d=new Date(); d.setDate(d.getDate()-4); return d.toISOString().slice(0,10); })(), notes: "" },
  { id: uid(), amount: 499,  description: "Netflix subscription",     category: "leisure",   date: (() => { const d=new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })(), notes: "" },
];

const DEFAULT_BUDGET = 29500;

// ─── Storage helpers ──────────────────────────────────────────────────────────
async function loadData() {
  try {
    const [expRes, budRes] = await Promise.all([
      window.storage.get("spendwise:expenses"),
      window.storage.get("spendwise:budget"),
    ]);
    const expenses = expRes ? JSON.parse(expRes.value) : SEED_EXPENSES;
    const budget   = budRes ? JSON.parse(budRes.value) : DEFAULT_BUDGET;
    return { expenses, budget };
  } catch {
    return { expenses: SEED_EXPENSES, budget: DEFAULT_BUDGET };
  }
}

async function saveExpenses(expenses) {
  try { await window.storage.set("spendwise:expenses", JSON.stringify(expenses)); } catch {}
}
async function saveBudget(budget) {
  try { await window.storage.set("spendwise:budget", JSON.stringify(budget)); } catch {}
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function groupByDate(expenses) {
  const groups = {};
  [...expenses].sort((a,b) => b.date.localeCompare(a.date)).forEach(e => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });
  return groups;
}

function labelDate(d) {
  const t = today(), yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  if (d === t) return "Today";
  if (d === yesterday.toISOString().slice(0,10)) return "Yesterday";
  return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short" });
}

// ─── Chart.js donut ──────────────────────────────────────────────────────────
function DonutChart({ data }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    const labels = data.map(d => CAT[d.id]?.label || d.id);
    const values = data.map(d => d.amount);
    const colors = data.map(d => CAT[d.id]?.color || "#888");
    chartRef.current = new window.Chart(ref.current, {
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#fff", hoverOffset: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "70%",
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed)}` } } }
      }
    });
    return () => chartRef.current?.destroy();
  }, [JSON.stringify(data)]);
  return <canvas ref={ref} role="img" aria-label="Spending by category donut chart" style={{ width:"100%", height:"100%" }}>Spending breakdown by category.</canvas>;
}

function BarChart({ data }) {
  const ref = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!ref.current || !window.Chart) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(ref.current, {
      type: "bar",
      data: {
        labels: data.map(d => d.label),
        datasets: [{ data: data.map(d => d.amount), backgroundColor: "#EEEDFE", borderColor: "#534AB7", borderWidth: 1.5, borderRadius: 6, hoverBackgroundColor: "#534AB7" }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: "#888780" } },
          y: { grid: { color: "#F1EFE8" }, ticks: { callback: v => "₹" + (v>=1000?Math.round(v/1000)+"k":v), font: { size: 11 }, color: "#888780" }, border: { display: false } }
        }
      }
    });
    return () => chartRef.current?.destroy();
  }, [JSON.stringify(data)]);
  return <canvas ref={ref} role="img" aria-label="Daily spending bar chart" style={{ width:"100%", height:"100%" }}>Daily spending.</canvas>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TxnRow({ expense, onDelete, onEdit }) {
  const cat = CAT[expense.category] || CAT.other;
  const isIncome = expense.category === "income";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:"0.5px solid #EEEDFE" }}>
      <div style={{ width:40, height:40, borderRadius:12, background:cat.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <i className={`ti ${cat.icon}`} style={{ fontSize:18, color:cat.color }} aria-hidden="true" />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{expense.description}</div>
        <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{cat.label} · {labelDate(expense.date)}</div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0, display:"flex", alignItems:"center", gap:8 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:500, color: isIncome ? "#0F6E56" : "#A32D2D" }}>
            {isIncome ? "+" : "−"}{fmt(expense.amount)}
          </div>
        </div>
        <button onClick={() => onDelete(expense.id)} style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:"#B4B2A9" }} aria-label="Delete expense">
          <i className="ti ti-trash" style={{ fontSize:15 }} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function BudgetBar({ spent, budget }) {
  const pct = Math.min(100, Math.round((spent / budget) * 100));
  const color = pct >= 100 ? "#A32D2D" : pct >= 80 ? "#BA7517" : "#9FE1CB";
  return (
    <div>
      <div style={{ height:5, background:"#FFFFFF22", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.6s ease-out" }} />
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
        <span style={{ fontSize:10, color:"#AFA9EC" }}>₹0</span>
        <span style={{ fontSize:10, color: pct >= 100 ? "#F7C1C1" : "#9FE1CB" }}>
          {pct >= 100 ? "Over budget!" : `${fmt(budget - spent)} remaining`}
        </span>
        <span style={{ fontSize:10, color:"#AFA9EC" }}>{fmt(budget)}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, subColor }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:"14px", border:"0.5px solid #DDDBD5", flex:1 }}>
      <div style={{ fontSize:22, fontWeight:500, color:"#2C2C2A" }}>{value}</div>
      <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:10, color: subColor || "#888780", marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function CategoryChip({ cat, selected, onClick }) {
  return (
    <button onClick={() => onClick(cat.id)} style={{ padding:"7px 14px", borderRadius:20, fontSize:12, border:`0.5px solid ${selected ? cat.color : "#D3D1C7"}`, background: selected ? cat.bg : "#F8F7FB", color: selected ? cat.color : "#888780", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit", transition:"all 0.15s" }}>
      {cat.label}
    </button>
  );
}

// ─── AddSheet ────────────────────────────────────────────────────────────────
function AddSheet({ open, onClose, onAdd, editExpense }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc]     = useState("");
  const [cat, setCat]       = useState("food");
  const [date, setDate]     = useState(today());
  const [notes, setNotes]   = useState("");
  const [error, setError]   = useState("");
  const amtRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (editExpense) {
        setAmount(String(editExpense.amount));
        setDesc(editExpense.description);
        setCat(editExpense.category);
        setDate(editExpense.date);
        setNotes(editExpense.notes || "");
      } else {
        setAmount(""); setDesc(""); setCat("food"); setDate(today()); setNotes("");
      }
      setError("");
      setTimeout(() => amtRef.current?.focus(), 100);
    }
  }, [open, editExpense]);

  function handleSave() {
    const n = parseFloat(amount);
    if (!n || n <= 0) { setError("Enter a valid amount"); return; }
    if (!desc.trim()) { setError("Add a description"); return; }
    onAdd({ id: editExpense?.id || uid(), amount: Math.round(n), description: desc.trim(), category: cat, date, notes: notes.trim() });
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(26,21,64,0.45)", zIndex:40, opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition:"opacity 0.25s" }} />
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderRadius:"24px 24px 0 0", padding:"20px 18px 32px", zIndex:50, transform: open ? "translateY(0)" : "translateY(110%)", transition:"transform 0.3s cubic-bezier(0.32,0.72,0,1)", maxWidth:480, margin:"0 auto" }}>
        <div style={{ width:36, height:4, borderRadius:2, background:"#D3D1C7", margin:"0 auto 16px" }} />
        <div style={{ fontSize:16, fontWeight:500, color:"#2C2C2A", marginBottom:16 }}>{editExpense ? "Edit expense" : "Add expense"}</div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:"#888780", display:"block", marginBottom:5 }}>Amount (₹)</label>
          <input ref={amtRef} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" inputMode="decimal"
            style={{ width:"100%", height:52, borderRadius:12, border:"0.5px solid #D3D1C7", background:"#EEEDFE", padding:"0 16px", fontSize:24, fontWeight:500, color:"#534AB7", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:"#888780", display:"block", marginBottom:5 }}>Description</label>
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What did you spend on?" maxLength={80}
            style={{ width:"100%", height:40, borderRadius:10, border:"0.5px solid #D3D1C7", background:"#F8F7FB", padding:"0 12px", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:"#888780", display:"block", marginBottom:8 }}>Category</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {CATEGORIES.map(c => <CategoryChip key={c.id} cat={c} selected={cat === c.id} onClick={setCat} />)}
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:"#888780", display:"block", marginBottom:5 }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width:"100%", height:40, borderRadius:10, border:"0.5px solid #D3D1C7", background:"#F8F7FB", padding:"0 12px", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, color:"#888780", display:"block", marginBottom:5 }}>Notes (optional)</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Extra details…" maxLength={120}
            style={{ width:"100%", height:40, borderRadius:10, border:"0.5px solid #D3D1C7", background:"#F8F7FB", padding:"0 12px", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
        </div>

        {error && <div style={{ fontSize:12, color:"#A32D2D", marginBottom:10, background:"#FCEBEB", padding:"7px 12px", borderRadius:8 }}>{error}</div>}

        <button onClick={handleSave} style={{ width:"100%", height:48, borderRadius:14, background:"#534AB7", color:"#fff", fontSize:15, fontWeight:500, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
          {editExpense ? "Save changes" : "Save expense"}
        </button>
      </div>
    </>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
function HomeScreen({ expenses, budget, onAdd, navTo }) {
  const month = currentMonth();
  const monthExp = expenses.filter(e => e.date.startsWith(month));
  const totalSpent = monthExp.filter(e => e.category !== "income").reduce((s,e) => s+e.amount, 0);
  const totalIncome = monthExp.filter(e => e.category === "income").reduce((s,e) => s+e.amount, 0);

  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekStr = weekStart.toISOString().slice(0,10);
  const weekSpent = expenses.filter(e => e.date >= weekStr && e.date <= today() && e.category !== "income").reduce((s,e) => s+e.amount, 0);
  const saved = totalIncome - totalSpent;

  const catTotals = CATEGORIES.filter(c => c.id !== "income").map(c => ({
    ...c, amount: monthExp.filter(e => e.category === c.id).reduce((s,e) => s+e.amount, 0)
  })).filter(c => c.amount > 0).sort((a,b) => b.amount - a.amount).slice(0, 5);

  const recent = [...expenses].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 8);

  return (
    <div style={{ paddingBottom:80 }}>
      {/* Header */}
      <div style={{ background:"#1A1540", padding:"14px 18px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"#534AB7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:500, color:"#CECBF6" }}>S</div>
            <div>
              <div style={{ fontSize:11, color:"#AFA9EC" }}>Good day,</div>
              <div style={{ fontSize:13, fontWeight:500, color:"#fff" }}>{new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</div>
            </div>
          </div>
          <button onClick={() => navTo("analytics")} style={{ width:34, height:34, borderRadius:"50%", border:"1px solid #534AB733", background:"#FFFFFF11", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#AFA9EC" }} aria-label="View analytics">
            <i className="ti ti-chart-pie" style={{ fontSize:16 }} aria-hidden="true" />
          </button>
        </div>
        <div style={{ background:"#FFFFFF15", borderRadius:16, padding:"14px 16px", border:"1px solid #FFFFFF22" }}>
          <div style={{ fontSize:11, color:"#AFA9EC", marginBottom:4 }}>Total spent this month</div>
          <div style={{ fontSize:30, fontWeight:500, color:"#fff" }}>{fmt(totalSpent)}</div>
          <div style={{ fontSize:11, color:"#AFA9EC", marginTop:3 }}>Budget: {fmt(budget)} · {Math.round((totalSpent/budget)*100)}% used</div>
          <div style={{ marginTop:12 }}>
            <BudgetBar spent={totalSpent} budget={budget} />
          </div>
        </div>
      </div>

      {/* Stat widgets */}
      <div style={{ display:"flex", gap:10, padding:"16px 16px 0" }}>
        <StatCard label="This week" value={fmt(weekSpent)} sub={weekSpent > 5000 ? "↑ High spend" : "On track"} subColor={weekSpent > 5000 ? "#A32D2D" : "#0F6E56"} />
        <StatCard label="Saved" value={saved >= 0 ? fmt(saved) : "−"+fmt(Math.abs(saved))} sub={saved >= 0 ? "↑ Great!" : "↓ Deficit"} subColor={saved >= 0 ? "#0F6E56" : "#A32D2D"} />
      </div>

      {/* Category strip */}
      {catTotals.length > 0 && (
        <div style={{ padding:"16px 0 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 16px", marginBottom:12 }}>
            <span style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>By category</span>
            <button onClick={() => navTo("analytics")} style={{ fontSize:12, color:"#534AB7", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>See all</button>
          </div>
          <div style={{ display:"flex", gap:10, overflowX:"auto", padding:"0 16px 4px" }}>
            {catTotals.map(c => (
              <div key={c.id} style={{ background:"#fff", borderRadius:14, padding:"12px 14px", border:"0.5px solid #DDDBD5", minWidth:108, flexShrink:0 }}>
                <div style={{ fontSize:20, marginBottom:6 }}><i className={`ti ${c.icon}`} style={{ color:c.color }} aria-hidden="true" /></div>
                <div style={{ fontSize:11, color:"#888780" }}>{c.label}</div>
                <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>{fmt(c.amount)}</div>
                <div style={{ height:3, background:"#EEEDFE", borderRadius:2, marginTop:8 }}>
                  <div style={{ height:"100%", width:`${Math.min(100,Math.round((c.amount/totalSpent)*100))}%`, background:c.color, borderRadius:2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      <div style={{ padding:"16px 16px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <span style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Recent expenses</span>
          <button onClick={() => navTo("history")} style={{ fontSize:12, color:"#534AB7", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>View all</button>
        </div>
        {recent.length === 0 ? (
          <div style={{ textAlign:"center", padding:"40px 0", color:"#888780", fontSize:13 }}>
            <i className="ti ti-receipt-off" style={{ fontSize:32, display:"block", marginBottom:8 }} aria-hidden="true" />
            No expenses yet. Tap + to add one.
          </div>
        ) : recent.map(e => <TxnRow key={e.id} expense={e} onDelete={() => {}} onEdit={() => {}} />)}
      </div>
    </div>
  );
}

// ─── ANALYTICS SCREEN ────────────────────────────────────────────────────────
function AnalyticsScreen({ expenses }) {
  const [period, setPeriod] = useState("month");

  const now = new Date();
  let filtered;
  if (period === "week") {
    const ws = new Date(now); ws.setDate(now.getDate() - 6);
    const wStr = ws.toISOString().slice(0,10);
    filtered = expenses.filter(e => e.date >= wStr && e.category !== "income");
  } else if (period === "month") {
    filtered = expenses.filter(e => e.date.startsWith(currentMonth()) && e.category !== "income");
  } else {
    filtered = expenses.filter(e => e.date.startsWith(now.getFullYear().toString()) && e.category !== "income");
  }

  const total = filtered.reduce((s,e) => s+e.amount, 0);

  const catData = CATEGORIES.filter(c => c.id !== "income").map(c => ({
    id: c.id, amount: filtered.filter(e => e.category === c.id).reduce((s,e) => s+e.amount, 0)
  })).filter(d => d.amount > 0).sort((a,b) => b.amount - a.amount);

  // Daily bar chart
  let barData = [];
  if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const ds = d.toISOString().slice(0,10);
      const label = d.toLocaleDateString("en-IN", { weekday:"short" });
      const amount = filtered.filter(e => e.date === ds).reduce((s,e) => s+e.amount, 0);
      barData.push({ label, amount });
    }
  } else if (period === "month") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const ds = d.toISOString().slice(0,10);
      const label = d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
      const amount = expenses.filter(e => e.date === ds && e.category !== "income").reduce((s,e) => s+e.amount, 0);
      barData.push({ label, amount });
    }
  } else {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    for (let m = 0; m <= now.getMonth(); m++) {
      const key = `${now.getFullYear()}-${String(m+1).padStart(2,"0")}`;
      const amount = expenses.filter(e => e.date.startsWith(key) && e.category !== "income").reduce((s,e) => s+e.amount, 0);
      barData.push({ label: months[m], amount });
    }
  }

  const topCat = catData[0];
  const avgDaily = barData.length > 0 ? Math.round(barData.reduce((s,d) => s+d.amount, 0) / barData.length) : 0;

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:"#1A1540", padding:"16px 18px 18px", color:"#fff" }}>
        <div style={{ fontSize:16, fontWeight:500, marginBottom:12 }}>Analytics</div>
        <div style={{ display:"flex", gap:8 }}>
          {["week","month","year"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding:"5px 14px", borderRadius:20, fontSize:11, background: period===p ? "#534AB7" : "#FFFFFF22", color:"#fff", border:"none", cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>{p}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 0" }}>
        {/* Donut */}
        {catData.length > 0 ? (
          <div style={{ background:"#fff", borderRadius:14, padding:16, border:"0.5px solid #DDDBD5", marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A", marginBottom:12 }}>Spending breakdown</div>
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <div style={{ position:"relative", width:120, height:120, flexShrink:0 }}>
                <DonutChart data={catData} />
                <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                  <div style={{ fontSize:12, color:"#888780" }}>Total</div>
                  <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>{fmt(total)}</div>
                </div>
              </div>
              <div style={{ flex:1 }}>
                {catData.map(d => {
                  const c = CAT[d.id];
                  return (
                    <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:c?.color, flexShrink:0 }} />
                      <div style={{ flex:1, fontSize:11, color:"#444441" }}>{c?.label}</div>
                      <div style={{ fontSize:11, fontWeight:500, color:"#2C2C2A" }}>{fmt(d.amount)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"32px 0", color:"#888780", fontSize:13 }}>No data for this period.</div>
        )}

        {/* Bar chart */}
        <div style={{ background:"#fff", borderRadius:14, padding:16, border:"0.5px solid #DDDBD5", marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A", marginBottom:12 }}>Daily spending</div>
          <div style={{ position:"relative", height:180 }}>
            <BarChart data={barData} />
          </div>
        </div>

        {/* Insight cards */}
        <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A", marginBottom:10 }}>Insights</div>
        {topCat && (
          <div style={{ background:"#fff", borderRadius:14, padding:14, border:"0.5px solid #DDDBD5", marginBottom:10, display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ width:36, height:36, borderRadius:10, background:CAT[topCat.id]?.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <i className={`ti ${CAT[topCat.id]?.icon}`} style={{ fontSize:18, color:CAT[topCat.id]?.color }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>Top category: {CAT[topCat.id]?.label}</div>
              <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{fmt(topCat.amount)} spent · {Math.round((topCat.amount/total)*100)}% of total</div>
            </div>
          </div>
        )}
        <div style={{ background:"#fff", borderRadius:14, padding:14, border:"0.5px solid #DDDBD5", display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"#EEEDFE", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <i className="ti ti-calendar-stats" style={{ fontSize:18, color:"#534AB7" }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>Avg daily spend</div>
            <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{fmt(avgDaily)} per day</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY SCREEN ───────────────────────────────────────────────────────────
function HistoryScreen({ expenses, onDelete, onEdit }) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState(null);

  const filtered = expenses.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const grouped = groupByDate(filtered);
  const dates = Object.keys(grouped).sort((a,b) => b.localeCompare(a));

  const total = filtered.filter(e => e.category !== "income").reduce((s,e) => s+e.amount, 0);

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:"#1A1540", padding:"16px 18px 18px" }}>
        <div style={{ fontSize:16, fontWeight:500, color:"#fff", marginBottom:12 }}>All expenses</div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FFFFFF15", borderRadius:10, padding:"8px 12px", border:"0.5px solid #FFFFFF22" }}>
          <i className="ti ti-search" style={{ fontSize:14, color:"#AFA9EC" }} aria-hidden="true" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search expenses…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:"#fff", fontFamily:"inherit" }} />
          {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#AFA9EC", padding:0 }} aria-label="Clear search"><i className="ti ti-x" style={{ fontSize:14 }} aria-hidden="true" /></button>}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"12px 16px 8px", borderBottom:"0.5px solid #EEEDFE" }}>
        <button onClick={() => setFilterCat(null)} style={{ padding:"5px 14px", borderRadius:20, fontSize:11, border:`0.5px solid ${!filterCat ? "#534AB7" : "#D3D1C7"}`, background: !filterCat ? "#EEEDFE" : "#F8F7FB", color: !filterCat ? "#534AB7" : "#888780", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit" }}>All</button>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? null : c.id)} style={{ padding:"5px 14px", borderRadius:20, fontSize:11, border:`0.5px solid ${filterCat===c.id ? c.color : "#D3D1C7"}`, background: filterCat===c.id ? c.bg : "#F8F7FB", color: filterCat===c.id ? c.color : "#888780", cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit" }}>{c.label}</button>
        ))}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div style={{ padding:"10px 16px", display:"flex", justifyContent:"space-between", fontSize:12, color:"#888780", borderBottom:"0.5px solid #EEEDFE" }}>
          <span>{filtered.length} transactions</span>
          <span>Total: <strong style={{ color:"#A32D2D" }}>{fmt(total)}</strong></span>
        </div>
      )}

      <div style={{ padding:"0 16px" }}>
        {dates.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:"#888780", fontSize:13 }}>
            <i className="ti ti-search-off" style={{ fontSize:32, display:"block", marginBottom:8 }} aria-hidden="true" />
            No matching expenses.
          </div>
        ) : dates.map(date => (
          <div key={date}>
            <div style={{ fontSize:11, color:"#888780", padding:"12px 0 6px", fontWeight:500 }}>{labelDate(date)}</div>
            {grouped[date].map(e => <TxnRow key={e.id} expense={e} onDelete={onDelete} onEdit={onEdit} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
function ProfileScreen({ expenses, budget, onBudgetChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(budget));
  const [notif, setNotif] = useState(true);
  const [exported, setExported] = useState(false);

  function saveB() {
    const n = parseInt(draft);
    if (n > 0) { onBudgetChange(n); setEditing(false); }
  }

  function exportCSV() {
    const rows = [["Date","Description","Category","Amount","Notes"]];
    [...expenses].sort((a,b) => b.date.localeCompare(a.date)).forEach(e => {
      rows.push([e.date, e.description, CAT[e.category]?.label || e.category, e.amount, e.notes || ""]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "spendwise_export.csv"; a.click();
    setExported(true); setTimeout(() => setExported(false), 2000);
  }

  const month = currentMonth();
  const monthExp = expenses.filter(e => e.date.startsWith(month));
  const spent = monthExp.filter(e => e.category !== "income").reduce((s,e) => s+e.amount, 0);
  const income = monthExp.filter(e => e.category === "income").reduce((s,e) => s+e.amount, 0);

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:"#1A1540", padding:"16px 18px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:"#534AB7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:500, color:"#CECBF6" }}>S</div>
          <div>
            <div style={{ fontSize:16, fontWeight:500, color:"#fff" }}>Your account</div>
            <div style={{ fontSize:12, color:"#AFA9EC" }}>SpendWise Personal</div>
          </div>
        </div>
      </div>

      <div style={{ padding:16 }}>
        {/* Month summary */}
        <div style={{ background:"#fff", borderRadius:14, border:"0.5px solid #DDDBD5", padding:"14px 16px", marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:12 }}>This month</div>
          <div style={{ display:"flex", gap:10 }}>
            <div style={{ flex:1, background:"#F8F7FB", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"#888780" }}>Spent</div>
              <div style={{ fontSize:16, fontWeight:500, color:"#A32D2D" }}>{fmt(spent)}</div>
            </div>
            <div style={{ flex:1, background:"#F8F7FB", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"#888780" }}>Income</div>
              <div style={{ fontSize:16, fontWeight:500, color:"#0F6E56" }}>{fmt(income)}</div>
            </div>
            <div style={{ flex:1, background:"#F8F7FB", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"#888780" }}>Balance</div>
              <div style={{ fontSize:16, fontWeight:500, color: (income-spent)>=0 ? "#0F6E56" : "#A32D2D" }}>{fmtSigned(income-spent)}</div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div style={{ background:"#fff", borderRadius:14, border:"0.5px solid #DDDBD5", overflow:"hidden", marginBottom:12 }}>
          {/* Budget */}
          <div style={{ padding:"14px 16px", borderBottom:"0.5px solid #EEEDFE" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <i className="ti ti-target" style={{ color:"#534AB7", fontSize:20 }} aria-hidden="true" />
                <span style={{ fontSize:14, color:"#2C2C2A" }}>Monthly budget</span>
              </div>
              {editing ? (
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input type="number" value={draft} onChange={e => setDraft(e.target.value)} style={{ width:90, height:32, borderRadius:8, border:"0.5px solid #534AB7", padding:"0 8px", fontSize:14, fontFamily:"inherit", outline:"none" }} />
                  <button onClick={saveB} style={{ padding:"5px 12px", borderRadius:8, background:"#534AB7", color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Save</button>
                  <button onClick={() => setEditing(false)} style={{ padding:"5px 10px", borderRadius:8, background:"#F1EFE8", color:"#888780", border:"none", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => { setDraft(String(budget)); setEditing(true); }} style={{ fontSize:14, color:"#534AB7", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                  {fmt(budget)} <i className="ti ti-pencil" style={{ fontSize:13 }} aria-hidden="true" />
                </button>
              )}
            </div>
            <div style={{ marginTop:10 }}>
              <BudgetBar spent={spent} budget={budget} />
            </div>
          </div>

          {/* Notifications */}
          <div style={{ padding:"14px 16px", borderBottom:"0.5px solid #EEEDFE", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <i className="ti ti-bell" style={{ color:"#534AB7", fontSize:20 }} aria-hidden="true" />
              <span style={{ fontSize:14, color:"#2C2C2A" }}>Budget alerts</span>
            </div>
            <button onClick={() => setNotif(n => !n)} aria-pressed={notif} style={{ width:40, height:22, borderRadius:11, background: notif ? "#534AB7" : "#D3D1C7", border:"none", cursor:"pointer", position:"relative", transition:"background 0.2s" }} aria-label="Toggle notifications">
              <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left: notif ? 20 : 2, transition:"left 0.2s" }} />
            </button>
          </div>

          {/* Export */}
          <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <i className="ti ti-download" style={{ color:"#534AB7", fontSize:20 }} aria-hidden="true" />
              <span style={{ fontSize:14, color:"#2C2C2A" }}>Export as CSV</span>
            </div>
            <button onClick={exportCSV} style={{ padding:"6px 14px", borderRadius:8, background: exported ? "#E1F5EE" : "#EEEDFE", color: exported ? "#0F6E56" : "#534AB7", border:"none", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>
              {exported ? "✓ Downloaded" : "Export"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ background:"#fff", borderRadius:14, border:"0.5px solid #DDDBD5", padding:"14px 16px" }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:12 }}>All-time stats</div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#888780", marginBottom:8 }}>
            <span>Total transactions</span><strong style={{ color:"#2C2C2A" }}>{expenses.length}</strong>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#888780", marginBottom:8 }}>
            <span>Total spent (all time)</span><strong style={{ color:"#A32D2D" }}>{fmt(expenses.filter(e=>e.category!=="income").reduce((s,e)=>s+e.amount,0))}</strong>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#888780" }}>
            <span>Total income (all time)</span><strong style={{ color:"#0F6E56" }}>{fmt(expenses.filter(e=>e.category==="income").reduce((s,e)=>s+e.amount,0))}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────
function BottomNav({ active, navTo, onAdd }) {
  const tabs = [
    { id:"home",      icon:"ti-home",       label:"Home" },
    { id:"analytics", icon:"ti-chart-pie",   label:"Analytics" },
    { id:"add",       icon:"ti-plus",        label:"Add", fab:true },
    { id:"history",   icon:"ti-list",        label:"History" },
    { id:"profile",   icon:"ti-user",        label:"Profile" },
  ];
  return (
    <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"0.5px solid #DDDBD5", display:"flex", padding:"10px 0 14px", zIndex:30, maxWidth:480, margin:"0 auto" }}>
      {tabs.map(t => t.fab ? (
        <div key={t.id} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <button onClick={onAdd} style={{ width:50, height:50, borderRadius:"50%", background:"#534AB7", border:"3px solid #F8F7FB", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginTop:-20, boxShadow:"0 2px 12px #534AB744" }} aria-label="Add expense">
            <i className="ti ti-plus" style={{ fontSize:24, color:"#fff" }} aria-hidden="true" />
          </button>
          <span style={{ fontSize:10, color:"#888780" }}>Add</span>
        </div>
      ) : (
        <button key={t.id} onClick={() => navTo(t.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
          <i className={`ti ${t.icon}`} style={{ fontSize:21, color: active===t.id ? "#534AB7" : "#888780" }} aria-hidden="true" />
          <span style={{ fontSize:10, color: active===t.id ? "#534AB7" : "#888780" }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── ROOT APP ────────────────────────────────────────────────────────────────
export default function SpendWise() {
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [screen, setScreen] = useState("home");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  // Load Chart.js
  useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => setChartReady(true);
    document.head.appendChild(s);
  }, []);

  // Load data
  useEffect(() => {
    loadData().then(({ expenses, budget }) => {
      setExpenses(expenses);
      setBudget(budget);
      setLoaded(true);
    });
  }, []);

  const handleAdd = useCallback(async (exp) => {
    setExpenses(prev => {
      const idx = prev.findIndex(e => e.id === exp.id);
      const next = idx >= 0 ? prev.map(e => e.id === exp.id ? exp : e) : [exp, ...prev];
      saveExpenses(next);
      return next;
    });
  }, []);

  const handleDelete = useCallback((id) => {
    if (!window.confirm("Delete this expense?")) return;
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      saveExpenses(next);
      return next;
    });
  }, []);

  const handleBudget = useCallback((n) => {
    setBudget(n);
    saveBudget(n);
  }, []);

  function openAdd() { setEditExpense(null); setSheetOpen(true); }

  if (!loaded) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:400, flexDirection:"column", gap:12, color:"#888780" }}>
      <i className="ti ti-loader-2" style={{ fontSize:32, animation:"spin 1s linear infinite" }} aria-hidden="true" />
      <span style={{ fontSize:13 }}>Loading SpendWise…</span>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily:"var(--font-sans)", background:"#F8F7FB", minHeight:"100vh", maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>
      <h2 className="sr-only">SpendWise — expense management app</h2>

      {/* Screens */}
      <div style={{ overflowY:"auto", height:"100vh", WebkitOverflowScrolling:"touch" }}>
        {screen === "home"      && <HomeScreen     expenses={expenses} budget={budget} onAdd={openAdd} navTo={setScreen} />}
        {screen === "analytics" && <AnalyticsScreen expenses={expenses} />}
        {screen === "history"   && <HistoryScreen   expenses={expenses} onDelete={handleDelete} onEdit={e => { setEditExpense(e); setSheetOpen(true); }} />}
        {screen === "profile"   && <ProfileScreen   expenses={expenses} budget={budget} onBudgetChange={handleBudget} />}
      </div>

      <BottomNav active={screen} navTo={setScreen} onAdd={openAdd} />
      <AddSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onAdd={handleAdd} editExpense={editExpense} />

      <style>{`.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}`}</style>
    </div>
  );
}
