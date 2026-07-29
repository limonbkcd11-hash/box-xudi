"use strict";

const { generateOfflineThreadingID } = require("../utils");

function isCallable(func) {
  try {
    Reflect.apply(func, null, []);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = function (defaultFuncs, api, ctx) {
  /**
   * Pin or unpin a message in a thread.
   * @param {string} messageID - The message to pin/unpin.
   * @param {string} threadID - The thread the message belongs to.
   * @param {boolean} [pin=true] - true to pin, false to unpin.
   * @param {function} [callback] - Optional callback(err, result).
   */
  return function pinMessage(messageID, threadID, pin, callback) {
    if (typeof pin === "function") {
      callback = pin;
      pin = true;
    }
    if (typeof pin !== "boolean") pin = true;

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

    ctx.wsReqNumber += 1;
    ctx.wsTaskNumber += 1;

    // label 682 = pin, label 683 = unpin (Facebook's internal task labels)
    const label = pin ? "682" : "683";

    const taskPayload = {
      thread_id: String(threadID),
      message_id: String(messageID),
    };

    const task = {
      failure_count: null,
      label: label,
      payload: JSON.stringify(taskPayload),
      queue_name: String(threadID),
      task_id: ctx.wsTaskNumber,
    };

    const content = {
      app_id: "2220391788200892",
      payload: JSON.stringify({
        data_trace_id: null,
        epoch_id: parseInt(generateOfflineThreadingID()),
        tasks: [task],
        version_id: "6903494529735864",
      }),
      request_id: ctx.wsReqNumber,
      type: 3,
    };

    if (isCallable(callback)) {
      ctx.reqCallbacks[ctx.wsReqNumber] = function (err) {
        if (err) return callback(err);
        callback(null, {
          messageID: String(messageID),
          threadID: String(threadID),
          pinned: pin,
        });
      };
    }

    ctx.mqttClient.publish("/ls_req", JSON.stringify(content), { qos: 1, retain: false });

    return returnPromise;
  };
};
