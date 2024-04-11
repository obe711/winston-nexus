# winston-nexus

A Nexus transport for Winston 3+ that logs to a channel via webhooks.



## Installation

```
npm install winston winston-nexus
```

## Usage



### Set up by adding

```javascript
const winston = require("winston");
const {UDP, MQTT} = require("winston-nexus");
const aedes = require('aedes')({ heartbeatInterval: 1000, connectTimeout: 1000});
const server = require('net').createServer(aedes.handle);

winston.loggers.add('udpLog', {
  level: config.env === 'development' ? config.logger.level : 'info',
});


winston.loggers.add('mqttLog', {
  level: config.env === 'development' ? config.logger.level : 'info',
});

const udpLog = winston.loggers.get('udpLog');
const mqttLog = winston.loggers.get('mqttLog');

udpLog.add(new UDP({
    host: "localhost",
    port: 3030,
    protocol: "udp4",
    appName: "name-of-app"
  }));

mqttLog.add(new MQTT({
    socket: server
    appName: "name-of-app"
  }));

...
```

### Logging
```javascript

const metadata = {
  someProp: "hello",
  anotherProp: 1234,
  ...
}
udpLog.info("My udp log message", metadata);
mqttLog.info("My mqtt log message", metadata);
```