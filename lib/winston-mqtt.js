/*
 * winston-mqtt.js: Transport for outputting logs to mqtt.
 *
 * (C) 2024 Obediah Klopfenstein
 * MIT LICENCE
 */

const winston = require('winston');
const Transport = require("winston-transport");
const { MESSAGE, LEVEL } = require('triple-beam');
const { enumerateErrorFormat, levels } = require('./utils');

// Ensure we have the correct winston here.
if (Number(winston.version.split('.')[0]) < 3) {
  throw new Error('Winston-mqtt requires winston >= 3.0.0');
}


class MQTT extends Transport {
  //
  // Expose the name of this Transport on the prototype
  //
  get name() {
    return 'mqtt';
  }

  constructor(options = {}) {
    //
    // Inherit from `winston-transport`.
    //
    super(options);

    this.format = winston.format.combine(
      enumerateErrorFormat(),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
      winston.format.splat(),
      winston.format.printf(({ _, message }) => `${message}`),
    )
    //
    // Merge the options for the target Mqtt topic.
    //
    this.setOptions(options);
  }

  setOptions(options) {
    this.host = options.host || 'localhost';
    this.port = options.port || 1883;
    this.pid = options.pid || process.pid;
    this.appName = options.appName || options.app_name || process.title;
    this.socket = options.socket;
    this.topic = options.topic || "log";
    this.qos = options.qos || 0;
    this.retain = options.retain || false;
  }

  log(info, callback) {
    let level = info[LEVEL];
    if (!~levels.indexOf(level)) {
      return callback(
        new Error('Cannot log unknown syslog level: ' + info[LEVEL])
      );
    }
    level = level === 'warn' ? 'warning' : level;
    const output = info[MESSAGE];

    const logMessage = {
      log: this.logInc,
      level: level,
      source: this.appName,
      pid: this.pid,
      timestamp: info.timestamp || Date.now(),
      label: info.label || this.appName,
      message: output,
      metadata: info.metadata
    }

    this.socket.publish({ topic: this.topic, payload: Buffer.from(JSON.stringify(logMessage)), qos: this.qos, retain: this.retain });
    this.emit('logged', info);
    if (this.logInc < Number.MAX_SAFE_INTEGER - 1)
      this.logInc++;
    else
      this.logInc = 0;
    callback(null, true);
  }
}

//
// Define a getter so that `winston.transports.MQTT`
// is available and thus backwards compatible.
//
winston.transports.MQTT = MQTT;

module.exports = MQTT