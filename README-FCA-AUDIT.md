# FCA / Reaction-Detection Audit — Setup & Usage

This file documents what changed in this pass and how to run/verify it.
Full technical details: `CHANGELOG-FCA-AUDIT.md`. Manual live tests:
`diagnostics/MANUAL_LIVE_TESTS.md`.

## Install

```bash
npm install
```

`package.json` now points `hridoy-fca` at the vendored `./fca` folder via
`"file:./fca"`. This makes `npm install` provision the FCA's own dependency
versions (notably `mqtt@5.x`, `npmlog@1.x`) in isolation, since they conflict
with versions the rest of the bot depends on at the root level. You don't
need to do anything differently — just run `npm install` as usual.

## Run

```bash
node index.js
```

Watch the first few log lines for:
```
warn: FCA  Loaded FCA v3.0.1 from: <your-project-path>/fca/index.js
```
This confirms the single, audited FCA implementation is what's actually
running. If you ever see a `node_modules/hridoy-fca` path here, or an error
about FCA resolving from `node_modules`, stop and check `package.json` / the
require in `bot/login/login.js` before anything else — it means the old
ambiguity got reintroduced.

## Run the test suite

```bash
node diagnostics/run-all.js
```

This runs three suites (18 tests total, all passing at time of delivery):
- `reconnect-policy.test.js` — backoff/circuit-breaker math
- `reaction-registry.test.js` — the `GoatBot.onReaction` TTL/cleanup logic
- `atomic-json.test.js` — atomic file writes, `.bak` corruption recovery

These don't need a Facebook session or network access. For the parts that
do (the real MQTT/WebSocket transport), see
`diagnostics/MANUAL_LIVE_TESTS.md`.

## Turning on reaction diagnostics

Normally leave these `false`. If reactions ever stop firing again, flip both
and restart:

```json
{
  "reactionDebug": true,
  "optionsFca": { "reactionDebug": true }
}
```

You'll get a full trace per reaction: raw FCA event → dispatch →
`GoatBot.onReaction` Map lookup (found/not found, current Map size) →
handler success/failure + latency — plus a watchdog tick every 15s showing
transport health (`mqttState`, time since last packet, time since last
reaction, reconnect count).

## What's in `fca_old_backup/`

The previous vendored FCA implementation, kept for reference only. It is
never loaded — `bot/login/login.js` requires `../../fca`, not this folder.
You can delete it once you've confirmed the new setup works for you.
