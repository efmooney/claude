const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const TABLES = {
  events: {
    cols: ["id", "date", "time", "person", "title"],
    required: ["date", "title"],
    defaults: { person: "Family", time: "" },
  },
  tasks: {
    cols: ["id", "person", "text", "done"],
    required: ["person", "text"],
    defaults: { done: 0 },
  },
  dinners: {
    cols: ["id", "date", "meal"],
    required: ["date", "meal"],
    defaults: {},
  },
};

async function listAll(db, table) {
  const { results } = await db.prepare(`SELECT * FROM ${table} ORDER BY date ASC`).all();
  return results;
}

async function listTasks(db) {
  const { results } = await db.prepare(`SELECT * FROM tasks ORDER BY person ASC, created_at ASC`).all();
  return results.map((r) => ({ ...r, done: !!r.done }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // GET /all — everything the dashboard needs in one call
      if (path === "/all" && method === "GET") {
        const [events, tasks, dinners] = await Promise.all([
          listAll(env.DB, "events"),
          listTasks(env.DB),
          listAll(env.DB, "dinners"),
        ]);
        return json({ events, tasks, dinners });
      }

      const match = path.match(/^\/(events|tasks|dinners)(?:\/([a-zA-Z0-9_-]+))?$/);
      if (!match) return json({ error: "Not found" }, 404);

      const table = match[1];
      const id = match[2];
      const spec = TABLES[table];

      if (method === "GET" && !id) {
        const rows = table === "tasks" ? await listTasks(env.DB) : await listAll(env.DB, table);
        return json(rows);
      }

      if (method === "POST" && !id) {
        const body = await request.json();
        for (const field of spec.required) {
          if (!body[field] && body[field] !== 0) return json({ error: `Missing field: ${field}` }, 400);
        }
        const newId = body.id || genId();
        const row = { id: newId, ...spec.defaults, ...body, id: newId };
        const cols = spec.cols;
        const placeholders = cols.map(() => "?").join(",");
        const values = cols.map((c) => (c === "done" ? (row[c] ? 1 : 0) : row[c] ?? spec.defaults[c] ?? ""));
        await env.DB.prepare(
          `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`
        ).bind(...values).run();
        return json(row, 201);
      }

      if (method === "PUT" && id) {
        const body = await request.json();
        const cols = spec.cols.filter((c) => c !== "id" && c in body);
        if (cols.length === 0) return json({ error: "No fields to update" }, 400);
        const setClause = cols.map((c) => `${c} = ?`).join(", ") + ", updated_at = datetime('now')";
        const values = cols.map((c) => (c === "done" ? (body[c] ? 1 : 0) : body[c]));
        const result = await env.DB.prepare(
          `UPDATE ${table} SET ${setClause} WHERE id = ?`
        ).bind(...values, id).run();
        if (result.meta.changes === 0) return json({ error: "Not found" }, 404);
        return json({ id, ...body });
      }

      if (method === "DELETE" && id) {
        const result = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
        if (result.meta.changes === 0) return json({ error: "Not found" }, 404);
        return json({ deleted: id });
      }

      return json({ error: "Method not allowed" }, 405);
    } catch (err) {
      return json({ error: err.message || "Server error" }, 500);
    }
  },
};
