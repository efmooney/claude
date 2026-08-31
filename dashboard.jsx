import React, { useState, useEffect, useRef } from "react";
import { Settings, X, Plus, Pencil, Trash2, Check, Utensils, CalendarDays, ListChecks } from "lucide-react";

const PEOPLE = ["Eric", "Angela", "Ezric"];
const PERSON_COLORS = {
  Eric: "#2F6F5E",
  Angela: "#7A4E9E",
  Ezric: "#B98A1F",
  Family: "#3A5A7D",
};
const DINNER_COLOR = "#3A5A7D";
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function pad(n) { return n < 10 ? "0" + n : "" + n; }
function toKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}
function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function isSameDay(a, b) { return toKey(a) === toKey(b); }
function niceDate(key) {
  const d = fromKey(key);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function seedData() {
  const today = startOfToday();
  const k = (n) => toKey(addDays(today, n));
  return {
    events: [
      { id: genId(), date: k(0), time: "08:30", person: "Family", title: "Drop kids at school" },
      { id: genId(), date: k(0), time: "17:00", person: "Ezric", title: "Soccer practice" },
      { id: genId(), date: k(1), time: "12:00", person: "Angela", title: "Lunch with Priya" },
      { id: genId(), date: k(1), time: "19:00", person: "Eric", title: "Board game night" },
      { id: genId(), date: k(2), time: "09:00", person: "Family", title: "Dentist — Ezric" },
      { id: genId(), date: k(4), time: "18:30", person: "Family", title: "Movie night" },
      { id: genId(), date: k(6), time: "10:00", person: "Eric", title: "Car service" },
    ],
    tasks: [
      { id: genId(), person: "Eric", text: "Pay the electric bill", done: false },
      { id: genId(), person: "Eric", text: "Mow the lawn", done: false },
      { id: genId(), person: "Angela", text: "Book dentist follow-up", done: false },
      { id: genId(), person: "Angela", text: "Return library books", done: true },
      { id: genId(), person: "Ezric", text: "Finish reading log", done: false },
      { id: genId(), person: "Ezric", text: "Pack soccer bag", done: false },
    ],
    dinners: [
      { id: genId(), date: k(0), meal: "Tacos" },
      { id: genId(), date: k(1), meal: "Sheet-pan chicken" },
      { id: genId(), date: k(2), meal: "Pasta night" },
      { id: genId(), date: k(4), meal: "Leftovers" },
      { id: genId(), date: k(5), meal: "Pizza" },
    ],
  };
}

const STORAGE_KEY = "household-board-data";

export default function HouseholdBoard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("events");

  const [eventForm, setEventForm] = useState({ date: toKey(startOfToday()), time: "", person: "Family", title: "" });
  const [editingEventId, setEditingEventId] = useState(null);
  const [taskForm, setTaskForm] = useState({ person: "Eric", text: "" });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [dinnerForm, setDinnerForm] = useState({ date: toKey(startOfToday()), meal: "" });
  const [editingDinnerId, setEditingDinnerId] = useState(null);

  const initialized = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, false);
        if (result && result.value) {
          setData(JSON.parse(result.value));
        } else {
          const seed = seedData();
          setData(seed);
          await window.storage.set(STORAGE_KEY, JSON.stringify(seed), false);
        }
      } catch (e) {
        const seed = seedData();
        setData(seed);
        try { await window.storage.set(STORAGE_KEY, JSON.stringify(seed), false); } catch (e2) {}
      } finally {
        setLoading(false);
        initialized.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!initialized.current || !data) return;
    (async () => {
      try {
        const res = await window.storage.set(STORAGE_KEY, JSON.stringify(data), false);
        setSaveError(!res);
      } catch (e) {
        setSaveError(true);
      }
    })();
  }, [data]);

  if (loading || !data) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", padding: "3rem", textAlign: "center", color: "#8A8676" }}>
        Loading the board…
      </div>
    );
  }

  const today = startOfToday();

  function updateData(fn) {
    setData((prev) => fn(prev));
  }

  // ---- Events ----
  function submitEvent() {
    if (!eventForm.title.trim() || !eventForm.date) return;
    updateData((prev) => {
      const events = [...prev.events];
      if (editingEventId) {
        const idx = events.findIndex((e) => e.id === editingEventId);
        if (idx !== -1) events[idx] = { ...events[idx], ...eventForm, title: eventForm.title.trim() };
      } else {
        events.push({ id: genId(), ...eventForm, title: eventForm.title.trim() });
      }
      return { ...prev, events };
    });
    setEventForm({ date: toKey(startOfToday()), time: "", person: "Family", title: "" });
    setEditingEventId(null);
  }
  function editEvent(ev) {
    setEventForm({ date: ev.date, time: ev.time || "", person: ev.person, title: ev.title });
    setEditingEventId(ev.id);
    setActiveTab("events");
    setManageOpen(true);
  }
  function deleteEvent(id) {
    updateData((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== id) }));
    if (editingEventId === id) { setEditingEventId(null); setEventForm({ date: toKey(startOfToday()), time: "", person: "Family", title: "" }); }
  }

  // ---- Tasks ----
  function submitTask() {
    if (!taskForm.text.trim()) return;
    updateData((prev) => {
      const tasks = [...prev.tasks];
      if (editingTaskId) {
        const idx = tasks.findIndex((t) => t.id === editingTaskId);
        if (idx !== -1) tasks[idx] = { ...tasks[idx], person: taskForm.person, text: taskForm.text.trim() };
      } else {
        tasks.push({ id: genId(), person: taskForm.person, text: taskForm.text.trim(), done: false });
      }
      return { ...prev, tasks };
    });
    setTaskForm({ person: "Eric", text: "" });
    setEditingTaskId(null);
  }
  function editTask(t) {
    setTaskForm({ person: t.person, text: t.text });
    setEditingTaskId(t.id);
    setActiveTab("tasks");
    setManageOpen(true);
  }
  function deleteTask(id) {
    updateData((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
    if (editingTaskId === id) { setEditingTaskId(null); setTaskForm({ person: "Eric", text: "" }); }
  }
  function toggleTask(id) {
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }

  // ---- Dinners ----
  function submitDinner() {
    if (!dinnerForm.meal.trim() || !dinnerForm.date) return;
    updateData((prev) => {
      const dinners = [...prev.dinners];
      if (editingDinnerId) {
        const idx = dinners.findIndex((d) => d.id === editingDinnerId);
        if (idx !== -1) dinners[idx] = { ...dinners[idx], ...dinnerForm, meal: dinnerForm.meal.trim() };
      } else {
        dinners.push({ id: genId(), ...dinnerForm, meal: dinnerForm.meal.trim() });
      }
      return { ...prev, dinners };
    });
    setDinnerForm({ date: toKey(startOfToday()), meal: "" });
    setEditingDinnerId(null);
  }
  function editDinner(d) {
    setDinnerForm({ date: d.date, meal: d.meal });
    setEditingDinnerId(d.id);
    setActiveTab("dinners");
    setManageOpen(true);
  }
  function deleteDinner(id) {
    updateData((prev) => ({ ...prev, dinners: prev.dinners.filter((d) => d.id !== id) }));
    if (editingDinnerId === id) { setEditingDinnerId(null); setDinnerForm({ date: toKey(startOfToday()), meal: "" }); }
  }

  function openManageAt(tab, prefillDate) {
    setActiveTab(tab);
    if (prefillDate && tab === "events") setEventForm((f) => ({ ...f, date: prefillDate }));
    if (prefillDate && tab === "dinners") setDinnerForm((f) => ({ ...f, date: prefillDate }));
    setManageOpen(true);
  }

  function resetAll() {
    const seed = seedData();
    setData(seed);
  }

  const nextThree = [0, 1, 2].map((n) => toKey(addDays(today, n)));
  const twoWeeks = Array.from({ length: 14 }, (_, i) => toKey(addDays(today, i)));
  const sevenDays = Array.from({ length: 7 }, (_, i) => toKey(addDays(today, i)));

  const eventsByDate = {};
  data.events.forEach((e) => { (eventsByDate[e.date] = eventsByDate[e.date] || []).push(e); });
  Object.values(eventsByDate).forEach((list) => list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")));

  const dinnerByDate = {};
  data.dinners.forEach((d) => { dinnerByDate[d.date] = d; });

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F5F2EA", color: "#24272B", minHeight: "600px", padding: "0", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .hb-display { font-family: 'Fraunces', serif; }
        .hb-mono { font-family: 'JetBrains Mono', monospace; }
        .hb-scroll::-webkit-scrollbar { width: 6px; }
        .hb-scroll::-webkit-scrollbar-thumb { background: #DAD4C4; border-radius: 4px; }
        .hb-btn { cursor: pointer; border: none; background: none; }
        .hb-btn:hover { opacity: 0.75; }
        .hb-card-day:hover { border-color: #B8B196 !important; }
        @media (max-width: 900px) {
          .hb-grid { grid-template-columns: 1fr !important; }
          .hb-panel { width: 100% !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 2rem 1rem", borderBottom: "1px solid #DAD4C4" }}>
        <div>
          <div className="hb-mono" style={{ fontSize: "11px", letterSpacing: "0.12em", color: "#8A8676", textTransform: "uppercase" }}>Household command center</div>
          <div className="hb-display" style={{ fontSize: "30px", fontWeight: 600, marginTop: "2px" }}>The Board</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div className="hb-mono" style={{ fontSize: "13px", color: "#5B5848", textAlign: "right" }}>
            {WEEKDAY_SHORT[today.getDay()]}, {MONTH_SHORT[today.getMonth()]} {today.getDate()}
          </div>
          <button className="hb-btn" onClick={() => setManageOpen(true)} title="Manage the board"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "#24272B", color: "#F5F2EA", borderRadius: "8px", fontSize: "13px", fontWeight: 500 }}>
            <Settings size={15} /> Manage
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="hb-grid" style={{ display: "grid", gridTemplateColumns: "26% 44% 30%", gap: "1.25rem", padding: "1.5rem 2rem 2.5rem" }}>

        {/* LEFT: next 3 days */}
        <div>
          <SectionLabel icon={<CalendarDays size={13} />} text="Next 3 days" />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            {nextThree.map((key, i) => {
              const d = fromKey(key);
              const list = eventsByDate[key] || [];
              return (
                <div key={key} className="hb-card-day" style={{ background: "#FFFFFF", border: "1px solid #E4DFCF", borderRadius: "10px", padding: "12px 14px", transition: "border-color .15s" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
                    <span className="hb-display" style={{ fontSize: "26px", fontWeight: 600, lineHeight: 1 }}>{d.getDate()}</span>
                    <span style={{ fontSize: "12px", color: "#8A8676", fontWeight: 500 }}>
                      {i === 0 ? "Today" : i === 1 ? "Tomorrow" : WEEKDAY_SHORT[d.getDay()]} · {MONTH_SHORT[d.getMonth()]}
                    </span>
                  </div>
                  {list.length === 0 ? (
                    <div style={{ fontSize: "12.5px", color: "#A6A28E" }}>Nothing on the books.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {list.map((e) => (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: PERSON_COLORS[e.person] || "#999", flexShrink: 0 }} />
                          {e.time && <span className="hb-mono" style={{ color: "#8A8676", fontSize: "11.5px", minWidth: "42px" }}>{e.time}</span>}
                          <span>{e.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MIDDLE: two week calendar */}
        <div>
          <SectionLabel icon={<CalendarDays size={13} />} text="Next 2 weeks" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginTop: "10px" }}>
            {twoWeeks.map((key, i) => {
              const d = fromKey(key);
              const list = eventsByDate[key] || [];
              const dinner = dinnerByDate[key];
              const todayCell = isSameDay(d, today);
              return (
                <div key={key} onClick={() => openManageAt("events", key)} title="Add or edit this day"
                  style={{
                    position: "relative", cursor: "pointer",
                    background: todayCell ? "#24272B" : "#FFFFFF",
                    color: todayCell ? "#F5F2EA" : "#24272B",
                    border: `1px solid ${todayCell ? "#24272B" : "#E4DFCF"}`,
                    borderRadius: "8px", padding: "6px 6px 8px", minHeight: "78px",
                    display: "flex", flexDirection: "column", gap: "4px",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="hb-mono" style={{ fontSize: "10px", opacity: 0.6 }}>{WEEKDAY_LETTERS[d.getDay()]}</span>
                    <span className="hb-display" style={{ fontSize: "14px", fontWeight: 600 }}>{d.getDate()}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                    {list.slice(0, 2).map((e) => (
                      <div key={e.id} style={{ fontSize: "9.5px", lineHeight: 1.25, display: "flex", alignItems: "center", gap: "3px", opacity: 0.9 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: PERSON_COLORS[e.person] || "#999", flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                      </div>
                    ))}
                    {list.length > 2 && <div style={{ fontSize: "9px", opacity: 0.6 }}>+{list.length - 2} more</div>}
                  </div>
                  {dinner && <Utensils size={10} style={{ position: "absolute", bottom: 6, right: 6, opacity: 0.55 }} />}
                  {todayCell && (
                    <div style={{
                      position: "absolute", top: -8, right: -8, width: 34, height: 34, borderRadius: "50%",
                      border: "1.5px dashed #C79A3B", transform: "rotate(-10deg)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "7px", fontWeight: 700, letterSpacing: "0.03em", color: "#C79A3B", background: "#24272B",
                    }}>TODAY</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: tasks + dinners */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <SectionLabel icon={<ListChecks size={13} />} text="Task lists" />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              {PEOPLE.map((person) => {
                const list = data.tasks.filter((t) => t.person === person);
                return (
                  <div key={person} style={{ background: "#FFFFFF", border: "1px solid #E4DFCF", borderRadius: "10px", padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: PERSON_COLORS[person], color: "#FFF", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {person[0]}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>{person}</span>
                    </div>
                    {list.length === 0 ? (
                      <div style={{ fontSize: "12px", color: "#A6A28E" }}>All clear.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {list.map((t) => (
                          <div key={t.id} onClick={() => toggleTask(t.id)} style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", fontSize: "12.5px" }}>
                            <span style={{
                              width: 14, height: 14, borderRadius: "4px", border: `1.5px solid ${t.done ? PERSON_COLORS[person] : "#C9C4B0"}`,
                              background: t.done ? PERSON_COLORS[person] : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                            }}>
                              {t.done && <Check size={10} color="#FFF" strokeWidth={3} />}
                            </span>
                            <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "#A6A28E" : "#24272B" }}>{t.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel icon={<Utensils size={13} />} text="Dinners this week" />
            <div style={{ background: "#FFFFFF", border: "1px solid #E4DFCF", borderRadius: "10px", padding: "6px 12px", marginTop: "10px" }}>
              {sevenDays.map((key, i) => {
                const d = fromKey(key);
                const dinner = dinnerByDate[key];
                return (
                  <div key={key} onClick={() => openManageAt("dinners", key)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 0", borderBottom: i < 6 ? "1px solid #EFEBDF" : "none", cursor: "pointer", fontSize: "12.5px",
                  }}>
                    <span style={{ color: "#8A8676", minWidth: "70px" }}>{WEEKDAY_SHORT[d.getDay()]} {d.getDate()}</span>
                    <span style={{ fontWeight: dinner ? 500 : 400, color: dinner ? "#24272B" : "#A6A28E", textAlign: "right" }}>
                      {dinner ? dinner.meal : "Not planned"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {saveError && (
        <div style={{ position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "#B94A3C", color: "#FFF", fontSize: "12px", padding: "6px 12px", borderRadius: "6px" }}>
          Couldn't save your last change. It may not persist.
        </div>
      )}

      {/* MANAGE PANEL */}
      {manageOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(36,39,43,0.35)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}
          onClick={() => setManageOpen(false)}>
          <div className="hb-panel" onClick={(e) => e.stopPropagation()} style={{
            width: "420px", maxWidth: "100%", background: "#F5F2EA", height: "100%", overflowY: "auto",
            boxShadow: "-8px 0 24px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column",
          }} className="hb-scroll hb-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem 0.75rem" }}>
              <div className="hb-display" style={{ fontSize: "20px", fontWeight: 600 }}>Manage the board</div>
              <button className="hb-btn" onClick={() => setManageOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ display: "flex", gap: "6px", padding: "0 1.5rem", marginTop: "6px" }}>
              {["events", "tasks", "dinners"].map((tab) => (
                <button key={tab} className="hb-btn" onClick={() => setActiveTab(tab)} style={{
                  fontSize: "12.5px", fontWeight: 500, padding: "7px 14px", borderRadius: "20px",
                  background: activeTab === tab ? "#24272B" : "transparent",
                  color: activeTab === tab ? "#F5F2EA" : "#5B5848",
                  border: activeTab === tab ? "none" : "1px solid #DAD4C4",
                  textTransform: "capitalize",
                }}>{tab}</button>
              ))}
            </div>

            <div style={{ padding: "1.25rem 1.5rem 2rem" }}>
              {activeTab === "events" && (
                <>
                  <FormBox title={editingEventId ? "Edit event" : "Add an event"}>
                    <FieldRow label="Date">
                      <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} style={inputStyle} />
                    </FieldRow>
                    <FieldRow label="Time (optional)">
                      <input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} style={inputStyle} />
                    </FieldRow>
                    <FieldRow label="Who">
                      <select value={eventForm.person} onChange={(e) => setEventForm({ ...eventForm, person: e.target.value })} style={inputStyle}>
                        <option>Family</option>
                        {PEOPLE.map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </FieldRow>
                    <FieldRow label="Title">
                      <input type="text" placeholder="Soccer practice" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} style={inputStyle} />
                    </FieldRow>
                    <FormButtons
                      editing={!!editingEventId}
                      onSubmit={submitEvent}
                      onCancel={() => { setEditingEventId(null); setEventForm({ date: toKey(startOfToday()), time: "", person: "Family", title: "" }); }}
                    />
                  </FormBox>
                  <ListTitle>All events</ListTitle>
                  {[...data.events].sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))).map((e) => (
                    <RowItem key={e.id} color={PERSON_COLORS[e.person]} onEdit={() => editEvent(e)} onDelete={() => deleteEvent(e.id)}>
                      <div style={{ fontSize: "13px", fontWeight: 500 }}>{e.title}</div>
                      <div className="hb-mono" style={{ fontSize: "11px", color: "#8A8676" }}>{niceDate(e.date)}{e.time ? ` · ${e.time}` : ""} · {e.person}</div>
                    </RowItem>
                  ))}
                  {data.events.length === 0 && <EmptyNote text="No events yet. Add one above." />}
                </>
              )}

              {activeTab === "tasks" && (
                <>
                  <FormBox title={editingTaskId ? "Edit task" : "Add a task"}>
                    <FieldRow label="Assign to">
                      <select value={taskForm.person} onChange={(e) => setTaskForm({ ...taskForm, person: e.target.value })} style={inputStyle}>
                        {PEOPLE.map((p) => <option key={p}>{p}</option>)}
                      </select>
                    </FieldRow>
                    <FieldRow label="Task">
                      <input type="text" placeholder="Pack soccer bag" value={taskForm.text} onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })} style={inputStyle} />
                    </FieldRow>
                    <FormButtons
                      editing={!!editingTaskId}
                      onSubmit={submitTask}
                      onCancel={() => { setEditingTaskId(null); setTaskForm({ person: "Eric", text: "" }); }}
                    />
                  </FormBox>
                  <ListTitle>All tasks</ListTitle>
                  {data.tasks.map((t) => (
                    <RowItem key={t.id} color={PERSON_COLORS[t.person]} onEdit={() => editTask(t)} onDelete={() => deleteTask(t.id)}>
                      <div style={{ fontSize: "13px", fontWeight: 500, textDecoration: t.done ? "line-through" : "none", color: t.done ? "#A6A28E" : "#24272B" }}>{t.text}</div>
                      <div className="hb-mono" style={{ fontSize: "11px", color: "#8A8676" }}>{t.person} · {t.done ? "Done" : "Open"}</div>
                    </RowItem>
                  ))}
                  {data.tasks.length === 0 && <EmptyNote text="No tasks yet. Add one above." />}
                </>
              )}

              {activeTab === "dinners" && (
                <>
                  <FormBox title={editingDinnerId ? "Edit dinner" : "Add a dinner"}>
                    <FieldRow label="Date">
                      <input type="date" value={dinnerForm.date} onChange={(e) => setDinnerForm({ ...dinnerForm, date: e.target.value })} style={inputStyle} />
                    </FieldRow>
                    <FieldRow label="Meal">
                      <input type="text" placeholder="Tacos" value={dinnerForm.meal} onChange={(e) => setDinnerForm({ ...dinnerForm, meal: e.target.value })} style={inputStyle} />
                    </FieldRow>
                    <FormButtons
                      editing={!!editingDinnerId}
                      onSubmit={submitDinner}
                      onCancel={() => { setEditingDinnerId(null); setDinnerForm({ date: toKey(startOfToday()), meal: "" }); }}
                    />
                  </FormBox>
                  <ListTitle>All dinners</ListTitle>
                  {[...data.dinners].sort((a, b) => a.date.localeCompare(b.date)).map((d) => (
                    <RowItem key={d.id} color={DINNER_COLOR} onEdit={() => editDinner(d)} onDelete={() => deleteDinner(d.id)}>
                      <div style={{ fontSize: "13px", fontWeight: 500 }}>{d.meal}</div>
                      <div className="hb-mono" style={{ fontSize: "11px", color: "#8A8676" }}>{niceDate(d.date)}</div>
                    </RowItem>
                  ))}
                  {data.dinners.length === 0 && <EmptyNote text="No dinners planned yet. Add one above." />}
                </>
              )}

              <button className="hb-btn" onClick={resetAll} style={{ marginTop: "1.5rem", fontSize: "11.5px", color: "#B94A3C", textDecoration: "underline" }}>
                Reset the board to example data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#8A8676" }}>
      {icon}
      <span className="hb-mono" style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{text}</span>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "7px", border: "1px solid #DAD4C4",
  background: "#FFFFFF", fontSize: "13px", fontFamily: "Inter, sans-serif", color: "#24272B", boxSizing: "border-box",
};

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ fontSize: "11.5px", color: "#8A8676", marginBottom: "4px" }}>{label}</div>
      {children}
    </div>
  );
}

function FormBox({ title, children }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E4DFCF", borderRadius: "10px", padding: "14px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>{title}</div>
      {children}
    </div>
  );
}

function FormButtons({ editing, onSubmit, onCancel }) {
  return (
    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
      <button className="hb-btn" onClick={onSubmit} style={{
        display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", background: "#24272B",
        color: "#F5F2EA", borderRadius: "7px", fontSize: "12.5px", fontWeight: 500,
      }}>
        <Plus size={13} /> {editing ? "Save changes" : "Add"}
      </button>
      {editing && (
        <button className="hb-btn" onClick={onCancel} style={{ fontSize: "12.5px", color: "#8A8676", padding: "7px 10px" }}>
          Cancel
        </button>
      )}
    </div>
  );
}

function ListTitle({ children }) {
  return <div className="hb-mono" style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#8A8676", margin: "1.25rem 0 8px" }}>{children}</div>;
}

function RowItem({ color, onEdit, onDelete, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 4px", borderBottom: "1px solid #EFEBDF" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <button className="hb-btn" onClick={onEdit} title="Edit"><Pencil size={13} color="#8A8676" /></button>
      <button className="hb-btn" onClick={onDelete} title="Delete"><Trash2 size={13} color="#B94A3C" /></button>
    </div>
  );
}

function EmptyNote({ text }) {
  return <div style={{ fontSize: "12.5px", color: "#A6A28E", padding: "8px 4px" }}>{text}</div>;
}
