/**
 * Simple structured logger with request correlation
 */
class Logger {
  constructor(functionName, requestId) {
    this.functionName = functionName;
    this.requestId = requestId;
  }

  log(level, message, meta = {}) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      functionName: this.functionName,
      requestId: this.requestId,
      message,
      ...meta
    }));
  }

  info(message, meta) {
    this.log('INFO', message, meta);
  }

  error(message, meta) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta) {
    this.log('WARN', message, meta);
  }
}

module.exports = { Logger };
