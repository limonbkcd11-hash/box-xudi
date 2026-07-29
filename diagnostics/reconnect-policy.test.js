"use strict";
/**
 * Unit tests for fca/src/reconnectPolicy.js.
 * Run with: node diagnostics/reconnect-policy.test.js
 * No network, no Facebook credentials, no mocking required — this is pure math.
 */
const assert = require("assert");
const { createReconnectPolicy } = require("../fca/src/reconnectPolicy.js");

let passed = 0;
function test(name, fn) {
    try {
        fn();
        console.log("  ok - " + name);
        passed++;
    } catch (err) {
        console.error("  FAIL - " + name);
        console.error("    " + err.message);
        process.exitCode = 1;
    }
}

console.log("reconnectPolicy");

test("backoff grows on repeated calls, staying within [base, max]", () => {
    const policy = createReconnectPolicy({ baseBackoffMs: 1000, maxBackoffMs: 8000, jitterRatio: 0 });
    const delays = [policy.nextBackoff(), policy.nextBackoff(), policy.nextBackoff(), policy.nextBackoff(), policy.nextBackoff(), policy.nextBackoff()];
    for (const d of delays) assert.ok(d >= 0 && d <= 8000, "delay out of range: " + d);
    assert.ok(delays[1] > delays[0], "backoff should grow between calls");
    assert.ok(delays[delays.length - 1] <= 8000, "backoff should be capped at maxBackoffMs");
});

test("jitter keeps delay within +/- ratio of the current backoff", () => {
    const policy = createReconnectPolicy({ baseBackoffMs: 10000, maxBackoffMs: 10000, jitterRatio: 0.2, backoffMultiplier: 1 });
    for (let i = 0; i < 50; i++) {
        const d = policy.nextBackoff();
        assert.ok(d >= 8000 && d <= 12000, "jittered delay out of expected +/-20% range: " + d);
    }
});

test("reset() drops backoff back to the base delay", () => {
    const policy = createReconnectPolicy({ baseBackoffMs: 1000, maxBackoffMs: 60000, jitterRatio: 0 });
    policy.nextBackoff(); policy.nextBackoff(); policy.nextBackoff();
    assert.ok(policy.getCurrentBackoffMs() > 1000, "backoff should have grown");
    policy.reset();
    assert.strictEqual(policy.getCurrentBackoffMs(), 1000, "reset() should restore the base delay");
});

test("circuit breaker does not trip under the limit", () => {
    const policy = createReconnectPolicy({ circuitBreakerLimit: 10, circuitBreakerWindowMs: 5 * 60 * 1000 });
    const now = Date.now();
    let lastCount = 0;
    for (let i = 0; i < 10; i++) lastCount = policy.recordReconnect(now + i * 1000);
    assert.strictEqual(policy.isCircuitBreakerTripped(lastCount), false, "should not trip at exactly the limit");
});

test("circuit breaker trips once reconnects exceed the limit within the window", () => {
    const policy = createReconnectPolicy({ circuitBreakerLimit: 10, circuitBreakerWindowMs: 5 * 60 * 1000 });
    const now = Date.now();
    let lastCount = 0;
    for (let i = 0; i < 15; i++) lastCount = policy.recordReconnect(now + i * 1000);
    assert.ok(policy.isCircuitBreakerTripped(lastCount), "should trip after 15 reconnects in the window");
});

test("old reconnects outside the rolling window are forgotten", () => {
    const policy = createReconnectPolicy({ circuitBreakerLimit: 10, circuitBreakerWindowMs: 60 * 1000 });
    const longAgo = Date.now() - 10 * 60 * 1000; // 10 min ago, outside a 1-min window
    for (let i = 0; i < 20; i++) policy.recordReconnect(longAgo + i * 100);
    const recentCount = policy.recordReconnect(Date.now());
    assert.strictEqual(recentCount, 1, "stale reconnects should have been trimmed from the window, expected only the fresh one to count");
});

console.log(passed + " test(s) passed");
if (process.exitCode) {
    console.error("SOME TESTS FAILED");
    process.exit(1);
}
