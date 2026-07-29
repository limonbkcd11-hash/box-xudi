"use strict";

/**
 * Pure reconnect-policy math, deliberately separated from listenMqtt.js so it
 * can be unit tested without spinning up a real MQTT/WebSocket connection.
 *
 * Exponential backoff with jitter: prevents many bots reconnecting after a
 * shared outage from all hitting Facebook's edge at the exact same instant
 * (a "reconnect storm"). Circuit breaker: if reconnects are happening far
 * too often, that's not a transient blip anymore — back off for a longer,
 * fixed cooldown instead of continuing to hammer the connection.
 */

const DEFAULTS = {
    baseBackoffMs: 3000,
    maxBackoffMs: 60000,
    backoffMultiplier: 1.7,
    jitterRatio: 0.2,            // +/- 20%
    circuitBreakerLimit: 10,      // reconnects...
    circuitBreakerWindowMs: 5 * 60 * 1000,   // ...within this window...
    circuitBreakerCooldownMs: 5 * 60 * 1000  // ...trigger this cooldown
};

function createReconnectPolicy(options) {
    const cfg = Object.assign({}, DEFAULTS, options || {});
    let currentBackoffMs = cfg.baseBackoffMs;
    let reconnectHistory = []; // timestamps

    return {
        /** Advance and return the next backoff delay (ms), with jitter applied. */
        nextBackoff(now) {
            now = now == null ? Date.now() : now;
            const jitterSpread = currentBackoffMs * cfg.jitterRatio;
            const withJitter = currentBackoffMs + (Math.random() * 2 - 1) * jitterSpread;
            currentBackoffMs = Math.min(currentBackoffMs * cfg.backoffMultiplier, cfg.maxBackoffMs);
            return Math.max(0, Math.round(withJitter));
        },

        /** Record a reconnect event and return how many have happened in the rolling window. */
        recordReconnect(now) {
            now = now == null ? Date.now() : now;
            reconnectHistory.push(now);
            reconnectHistory = reconnectHistory.filter((t) => now - t < cfg.circuitBreakerWindowMs);
            return reconnectHistory.length;
        },

        /** Whether the circuit breaker should be engaged given a recent-reconnect count. */
        isCircuitBreakerTripped(recentCount) {
            return recentCount > cfg.circuitBreakerLimit;
        },

        cooldownMs() {
            return cfg.circuitBreakerCooldownMs;
        },

        /** Call when a connection has proven stable, to drop back to the base delay. */
        reset() {
            currentBackoffMs = cfg.baseBackoffMs;
        },

        getCurrentBackoffMs() {
            return currentBackoffMs;
        },

        getReconnectHistory() {
            return reconnectHistory.slice();
        }
    };
}

module.exports = { createReconnectPolicy, DEFAULTS };
