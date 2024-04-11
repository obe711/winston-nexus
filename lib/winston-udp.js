/*
 * winston-udp.js: Transport for outputting logs to udp.
 *
 * (C) 2024 Obediah Klopfenstein
 * MIT LICENCE
 */

const winston = require('winston');
const Transport = require("winston-transport");
const { MESSAGE, LEVEL } = require('triple-beam');
const dgram = require('node:dgram');
const { enumerateErrorFormat, levels } = require('./utils');

// Ensure we have the correct winston here.
if (Number(winston.version.split('.')[0]) < 3) {
  throw new Error('Winston-udp requires winston >= 3.0.0');
}


class UDP extends Transport {
  //
  // Expose the name of this Transport on the prototype
  //
  get name() {
    return 'udp';
  }

  constructor(options = {}) {
    //
    // Inherit from `winston-transport`.
    //
    super(options);

    //
    // Setup connection state
    //
    this.queue = [];
    this.inFlight = 0;
    this.logInc = 0;

    this.format = winston.format.combine(
      enumerateErrorFormat(),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
      winston.format.splat(),
      winston.format.printf(({ _, message }) => `${message}`),
    )

    //
    // Merge the options for the target UDP socket.
    //
    this.setOptions(options);

    this.client = null;
  }

  setOptions(options) {
    this.host = options.host || 'localhost';
    this.port = options.port || 7999;
    this.protocol = options.protocol || 'udp4';
    this.pid = options.pid || process.pid;
    this.appName = options.appName || options.app_name || process.title;
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

    this.connect(err => {
      if (err) {
        this.queue.push(logMessage);
        return callback();
      }

      const onError = logErr => {
        if (logErr) {
          this.queue.push(syslogMsg);
          this.emit('error', logErr);
        }
        this.emit('logged', info);
        this.inFlight--;
        if (this.logInc < Number.MAX_SAFE_INTEGER - 1)
          this.logInc++;
        else
          this.logInc = 0;
      };

      const sendDgram = () => {
        const buffer = Buffer.from(JSON.stringify(logMessage));

        this.inFlight++;
        this.client.send(buffer, this.port, this.host, (err) => {
          onError(err);
        })
      };

      sendDgram();
      callback(null, true);
    })
  }

  connect(callback) {
    //
    // If the socket already exists then respond
    //
    if (this.client) {
      return callback(null);
    }

    this.client = dgram.createSocket(this.protocol);

    //this.setupEvents();
    return callback(null);
  }
}

//
// Define a getter so that `winston.transports.UDP`
// is available and thus backwards compatible.
//
winston.transports.UDP = UDP;

module.exports = UDP;