"use strict";

/**
 * Message Scheduler — schedule messages to be sent at a specific
 * future time. api.getScheduler() returns a singleton instance per
 * logged-in session with scheduleMessage/cancel/list/destroy.
 */
module.exports = function (defaultFuncs, api, ctx) {
  if (!ctx._scheduler) {
    ctx._scheduler = createSchedulerInstance(api);
  }
  return ctx._scheduler;
};

function createSchedulerInstance(api) {
  const scheduledMessages = new Map(); // id -> ScheduledMessage
  let nextId = 1;

  /**
   * @param {string|Object} message
   * @param {string|string[]} threadID
   * @param {Date|number|string} when - Date, timestamp (ms), or ISO string
   * @param {Object} [options]
   * @param {string} [options.replyMessageID]
   * @param {boolean} [options.isGroup]
   * @param {Function} [options.callback]
   * @returns {string} scheduled message id
   */
  function scheduleMessage(message, threadID, when, options = {}) {
    let timestamp;
    if (when instanceof Date) timestamp = when.getTime();
    else if (typeof when === "number") timestamp = when;
    else if (typeof when === "string") timestamp = new Date(when).getTime();
    else throw new Error("Invalid 'when' parameter. Must be Date, number (timestamp), or ISO string");

    if (isNaN(timestamp)) throw new Error("Invalid date/time");

    const now = Date.now();
    if (timestamp <= now) throw new Error("Scheduled time must be in the future");

    const id = `scheduled_${nextId++}_${now}`;
    const delay = timestamp - now;

    const scheduled = {
      id,
      message,
      threadID,
      timestamp,
      createdAt: now,
      options: {
        replyMessageID: options.replyMessageID,
        isGroup: options.isGroup,
        callback: options.callback,
      },
      cancelled: false,
    };

    scheduled.timeout = setTimeout(() => {
      if (scheduled.cancelled) return;
      try {
        api
          .sendMessage(message, threadID, scheduled.options.callback || (() => {}), scheduled.options.replyMessageID, scheduled.options.isGroup)
          .then(() => scheduledMessages.delete(id))
          .catch((err) => {
            if (scheduled.options.callback) scheduled.options.callback(err);
            scheduledMessages.delete(id);
          });
      } catch (err) {
        scheduledMessages.delete(id);
      }
    }, delay);

    scheduledMessages.set(id, scheduled);
    return id;
  }

  function cancelScheduledMessage(id) {
    const scheduled = scheduledMessages.get(id);
    if (!scheduled || scheduled.cancelled) return false;
    clearTimeout(scheduled.timeout);
    scheduled.cancelled = true;
    scheduledMessages.delete(id);
    return true;
  }

  function getScheduledMessage(id) {
    const scheduled = scheduledMessages.get(id);
    if (!scheduled || scheduled.cancelled) return null;
    return {
      id: scheduled.id,
      message: scheduled.message,
      threadID: scheduled.threadID,
      timestamp: scheduled.timestamp,
      createdAt: scheduled.createdAt,
      options: { ...scheduled.options },
      timeUntilSend: scheduled.timestamp - Date.now(),
    };
  }

  function listScheduledMessages() {
    const now = Date.now();
    const list = [];
    for (const scheduled of scheduledMessages.values()) {
      if (scheduled.cancelled) continue;
      list.push({
        id: scheduled.id,
        message: scheduled.message,
        threadID: scheduled.threadID,
        timestamp: scheduled.timestamp,
        createdAt: scheduled.createdAt,
        options: { ...scheduled.options },
        timeUntilSend: scheduled.timestamp - now,
      });
    }
    return list.sort((a, b) => a.timestamp - b.timestamp);
  }

  function cancelAllScheduledMessages() {
    let count = 0;
    for (const id of Array.from(scheduledMessages.keys())) {
      if (cancelScheduledMessage(id)) count++;
    }
    return count;
  }

  function getScheduledCount() {
    return scheduledMessages.size;
  }

  function cleanup() {
    const now = Date.now();
    for (const [id, scheduled] of scheduledMessages.entries()) {
      if (scheduled.cancelled || scheduled.timestamp < now) scheduledMessages.delete(id);
    }
  }

  const cleanupInterval = setInterval(cleanup, 5 * 60 * 1000);
  if (cleanupInterval.unref) cleanupInterval.unref();

  function destroy() {
    clearInterval(cleanupInterval);
    return cancelAllScheduledMessages();
  }

  return {
    scheduleMessage,
    cancelScheduledMessage,
    getScheduledMessage,
    listScheduledMessages,
    cancelAllScheduledMessages,
    getScheduledCount,
    cleanup,
    destroy,
  };
}
