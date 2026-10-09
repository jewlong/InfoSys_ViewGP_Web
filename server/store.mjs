import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function createStore(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, content TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS versions (project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, revision INTEGER NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(project_id,revision));",
  );
  return {
    list: () =>
      db
        .prepare(
          "SELECT id,name,revision,updated_at FROM projects ORDER BY updated_at DESC",
        )
        .all(),
    get: (id) => {
      const r = db.prepare("SELECT * FROM projects WHERE id=?").get(id);
      return r
        ? {
            project: JSON.parse(r.content),
            revision: r.revision,
            updatedAt: r.updated_at,
          }
        : null;
    },
    save(project, expectedRevision) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const row = db
          .prepare("SELECT revision FROM projects WHERE id=?")
          .get(project.id);
        const current = row?.revision ?? 0;
        if (expectedRevision !== current) {
          const e = new Error("專案已有新版本，請重新開啟或另存新專案。");
          e.status = 409;
          throw e;
        }
        const revision = current + 1;
        const content = JSON.stringify(project);
        const now = new Date().toISOString();
        db.prepare(
          "INSERT INTO projects VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,content=excluded.content,revision=excluded.revision,updated_at=excluded.updated_at",
        ).run(project.id, project.name, content, revision, now);
        db.prepare("INSERT INTO versions VALUES (?,?,?,?)").run(
          project.id,
          revision,
          content,
          now,
        );
        db.exec("COMMIT");
        return { revision, updatedAt: now };
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    close: () => db.close(),
  };
}
