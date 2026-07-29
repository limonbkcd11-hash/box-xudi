# FCA/Reaction-Detection Audit & Upgrade — Changelog

(Kept separate from the project's own auto-generated `CHANGELOG.md` so that
file's history stays intact.)

## Root causes found

1. **Two FCA implementations existed in the project.** `bot/login/login.js`
   required the npm package `hridoy-fca`, while a second, older, weaker copy
   sat vendored at `fca/` (empty `close` handler, no watchdog, relied on
   `mqtt.js`'s built-in `reconnectPeriod`, which does not work with this
   project's custom WebSocket-duplex transport). Whichever one actually
   resolved at runtime depended on `node_modules` state that wasn't
   guaranteed to match the improved source you provided separately.
2. **`message_reply` bypassed the `listenEvents` gate that `message_reaction`
   and unsend were subject to.** This is why, if `listenEvents` was ever
   toggled off (via the admin `setting.js` command), replies kept working
   while reactions silently stopped — matching the reported symptom exactly.
   This is a legitimate control surface (some deployments want to disable
   "other" events while keeping core messaging), not a bug in itself, but it
   is now clearly logged so an accidental toggle is obvious instead of
   mysterious.
3. **`GoatBot.onReaction` was a plain, unbounded `Map`.** Any command that
   registered a reaction handler and didn't clean it up (error before
   `.delete()`, forgotten cleanup, etc.) leaked forever.
4. **`mqtt`/`npmlog` version mismatch risk.** The bot's root `package.json`
   pins `mqtt@^4.3.7` / `npmlog@^7.0.1`; the FCA code needs `mqtt@^5.10.1` /
   `npmlog@^1.2.0`. Vendoring FCA as a plain subfolder (instead of a real
   installed package) would have silently resolved to the wrong major
   versions via Node's upward `node_modules` lookup.

## Changes

### FCA (`fca/`)
- Replaced the old vendored copy with the audited `fca-hridoy-main` source
  (moved to `fca_old_backup/` for reference — **not loaded, not shipped**).
- Ported `httpPostFormData` from the old copy (used by `scripts/cmds/post.js`)
  since it didn't exist in the new base; fixed its one incompatibility
  (`utils.error` doesn't exist in this build — switched to `log.error`).
- `src/listenMqtt.js`:
  - Added a `health` object (`ctx.health` / `global.GoatBot.fcaHealth`)
    tracking mqtt state, last packet time, last dispatch, last reaction,
    reconnect count/history — used for diagnostics, never for deciding
    whether to reconnect (reaction inactivity is not a health signal).
  - Extracted backoff/circuit-breaker math into `src/reconnectPolicy.js`
    (pure functions, unit tested in `diagnostics/reconnect-policy.test.js`).
  - Exponential backoff with jitter (3s → 60s cap), reset to base after 60s
    of stable connection, circuit breaker (>10 reconnects/5min → 5min
    cooldown).
  - `reactionDebug` (config-gated, default off) logs the raw reaction delta,
    the dispatched event, and watchdog ticks (mqtt state, time since last
    packet/reaction, reconnect count, listener counts).
  - WebSocket-level errors are now logged instead of silently discarded.
  - `MaxListenersExceededWarning` is routed through the logger instead of
    being invisible on stderr — never suppressed via `setMaxListeners`.
- `index.js`: registered `reactionDebug` as a recognized boolean option;
  default `false`.

### Bot core
- `bot/login/login.js`:
  - `require("hridoy-fca")` → `require("../../fca")` (single, unambiguous,
    local path).
  - Startup integrity log: prints the resolved FCA path + version; hard
    warning if it ever resolves from `node_modules`.
  - `GoatBot.onReaction` is now a `ReactionRegistry` (`utils/reactionRegistry.js`)
    instead of a plain `Map` — identical API for every existing command, plus
    a periodic sweep (every 15 min) that removes entries older than 24h
    (configurable via `onReactionTTLHours`), skipping anything marked
    `persistent: true`. Old sweep timer is stopped before a new registry is
    created on relogin, so relogins can't leak timers.
  - `account.txt` cookie refresh now uses an atomic write
    (`utils/atomicJson.js`) instead of a plain `fs.writeFileSync`.
- `bot/handler/handlerEvents.js`: `reactionDebug`-gated logging through the
  full dispatch path (Map size, handler found/not found, latency,
  success/failure) — off by default, zero overhead when disabled beyond one
  boolean check.
- `dashboard/app.js`: the `/changefbstate` endpoint now writes `account.txt`
  atomically instead of with a plain `fs.writeFileSync`.

### New files
- `utils/reactionRegistry.js` — TTL-based `Map` subclass.
- `utils/atomicJson.js` — atomic write-then-rename + `.bak` corruption
  recovery + per-file write queue.
- `fca/src/reconnectPolicy.js` — pure backoff/circuit-breaker logic.
- `diagnostics/` — unit tests (`run-all.js` runs everything) + a manual
  live-test checklist for the parts that need a real Facebook session.

### Config
- `config.json`: added `reactionDebug` (top-level, bot dispatcher) and
  `optionsFca.reactionDebug` (FCA layer), both default `false`.
- `package.json`: `"hridoy-fca": "^3.0.1"` → `"hridoy-fca": "file:./fca"` so
  `npm install` provisions FCA's own dependency versions in isolation
  instead of conflicting with the bot's root-level `mqtt`/`npmlog` versions.

## Not changed
- No existing command files were modified. `GoatBot.onReaction.set(...)`
  call sites work exactly as before.
- No database schema or format changes (the main user/thread/global data
  uses SQLite/MongoDB via Sequelize models, not raw JSON — that was already
  reasonably safe; atomic-write hardening was applied to the JSON files that
  do exist: `account.txt` and the dashboard's fbstate endpoint).
- `fca-liane-utils` dependency: present in `package.json` but not referenced
  anywhere in the codebase. Left untouched (out of scope) — worth removing
  in a future cleanup pass.
- The bot code references `_0x4d5048.sessionGuard` (an auto-save-appstate
  feature) — this method does not exist in either the old or new FCA, so
  that block silently no-ops. Not a regression introduced here; flagged for
  your awareness since it looks like a half-implemented feature.

## Known limitations
- The reconnect/backoff/circuit-breaker logic is unit tested in isolation
  (`diagnostics/reconnect-policy.test.js`), but the real MQTT/WebSocket
  transport can only be exercised against a live Facebook session — see
  `diagnostics/MANUAL_LIVE_TESTS.md` for the manual drill to run once
  deployed.
- If `listenEvents` is ever toggled off for your account (via the settings
  command), reactions and unsends will stop while replies keep working —
  this is intentional existing behavior, now clearly logged, not a bug this
  pass introduced or removed.
