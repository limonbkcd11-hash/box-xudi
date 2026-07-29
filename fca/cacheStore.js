"use strict";

/**
 * A minimal TTL cache with optional JSON-file persistence.
 *
 * Deliberately NOT built on sqlite3/better-sqlite3/sequelize — those are
 * native modules, and native modules are exactly what broke `koffi` on
 * Termux/Android earlier. This is pure JS so it works everywhere Node runs,
 * at the cost of being a simpler key→value store rather than a real
 * relational database.
 *
 * Usage (per logged-in ctx):
 *   const cache = createCacheStore({ filePath, ttlMs });
 *   cache.get(key)          -> value or undefined (undefined if expired/missing)
 *   cache.set(key, value)
 *   cache.destroy()         -> stop the autosave timer
 */
function createCacheStore(options) {
  options = options || {};
  const ttlMs = typeof options.ttlMs === "number" ? options.ttlMs : 10 * 60 * 1000; // 10 min default
  const filePath = options.filePath || null;

  const store = new Map(); // key -> { value, expiresAt }

  if (filePath) {
    try {
      const fs = require("fs");
      if (fs.existsSync(filePath)) {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const now = Date.now();
        for (const key in raw) {
          if (raw[key] && raw[key].expiresAt > now) store.set(key, raw[key]);
        }
      }
    } catch (_) {
      // Corrupt or unreadable cache file — start fresh rather than crash.
    }
  }

  function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value) {
    store.set(key, { value: value, expiresAt: Date.now() + ttlMs });
  }

  function persist() {
    if (!filePath) return;
    try {
      const fs = require("fs");
      const obj = {};
      store.forEach(function (v, k) { obj[k] = v; });
      fs.writeFileSync(filePath, JSON.stringify(obj));
    } catch (_) {
      // Best-effort only — a failed write should never crash the bot.
    }
  }

  let saveInterval = null;
  if (filePath) {
    saveInterval = setInterval(persist, 60 * 1000);
    if (saveInterval.unref) saveInterval.unref();
  }

  function destroy() {
    if (saveInterval) clearInterval(saveInterval);
    persist();
  }

  return { get: get, set: set, destroy: destroy, persist: persist };
}

module.exports = { createCacheStore: createCacheStore };
