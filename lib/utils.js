const winston = require('winston');

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

const levels = Object.keys({
  debug: 0,
  info: 1,
  notice: 2,
  warning: 3,
  warn: 3,
  error: 4,
  err: 4,
  crit: 5,
  alert: 6,
  emerg: 7
});


module.exports = {
  enumerateErrorFormat,
  levels
}