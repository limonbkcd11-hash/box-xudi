"use strict";

const { generateOfflineThreadingID } = require("../utils");

module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Forward a message to one or multiple threads.
   * @param {string} messageID - The message to forward.
   * @param {string|string[]} threadID - Thread ID or array of thread IDs to forward to.
   * @param {function} [callback] - Optional callback(err, result).
   */
  return async function forwardMessage(messageID, threadID, callback) {
    let resolveFunc = function () {};
    let rejectFunc = function () {};
    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, data) {
        if (err) return rejectFunc(err);
        resolveFunc(data);
      };
    }

    if (!messageID || !threadID) {
      const err = { error: "messageID and threadID are required." };
      callback(err);
      return returnPromise;
    }

    if (!ctx.mqttClient || !ctx.mqttClient.connected) {
      const err = { error: "Not connected to MQTT. Please try again later." };
      callback(err);
      return returnPromise;
    }

    const targets = Array.isArray(threadID) ? threadID : [threadID];
    const results = [];
    const errors = [];

    for (const tid of targets) {
      await new Promise(function (res) {
        ctx.wsReqNumber += 1;
        ctx.wsTaskNumber += 1;
        const reqID = ctx.wsReqNumber;
        const taskID = ctx.wsTaskNumber;

        const taskPayload = {
          thread_id: String(tid),
          otid: generateOfflineThreadingID(),
          source: 65544,
          send_type: 5,
          sync_group: 1,
          mark_thread_read: 0,
          forwarded_msg_id: String(messageID),
          strip_forwarded_msg_caption: 0,
          initiating_source: 1,
        };

        const content = {
          app_id: "2220391788200892",
          payload: JSON.stringify({
            data_trace_id: null,
            epoch_id: parseInt(generateOfflineThreadingID()),
            tasks: [
              {
                failure_count: null,
                label: "46",
                payload: JSON.stringify(taskPayload),
                queue_name: String(tid),
                task_id: taskID,
              },
            ],
            version_id: "6903494529735864",
          }),
          request_id: reqID,
          type: 3,
        };

        ctx.reqCallbacks[reqID] = function (err) {
          if (err) errors.push({ threadID: tid, error: err.message || String(err) });
          else results.push({ threadID: tid, messageID: String(messageID) });
          res();
        };

        try {
          ctx.mqttClient.publish("/ls_req", JSON.stringify(content), { qos: 1, retain: false });
        } catch (err) {
          delete ctx.reqCallbacks[reqID];
          errors.push({ threadID: tid, error: err.message || String(err) });
          res();
        }
      });
    }

    const finalResult = { success: results, failed: errors };

    if (errors.length > 0 && results.length === 0) {
      callback({ error: "All forwards failed.", details: errors });
    } else {
      callback(null, finalResult);
    }

    return returnPromise;
  };
};
