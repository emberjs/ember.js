export enum LogLevel {
  Trace,
  Debug,
  Warn,
  Error
}

interface Console {
  log(message: string);
  warn(message: string);
  error(message: string);
  trace();
}

class NullConsole {
  log(message: string) {}
  warn(message: string) {}
  error(message: string) {}
  trace() {}
}

export class Logger {
  private console: Console;
  public level: LogLevel;
  public f = ALWAYS;
  public force = ALWAYS;

  constructor({ console, level }: { console: Console, level: LogLevel }) {
    this.console = console;
    this.level = level;
  }

  private skipped(level: LogLevel): boolean {
    return level < this.level;
  }

  trace(message?: any, { stackTrace = false } = {}) {
    if (this.skipped(LogLevel.Trace)) return;
    this.console.log(message);
    if (stackTrace) this.console.trace();
  }

  debug(message: any, { stackTrace = false } = {}) {
    if (this.skipped(LogLevel.Debug)) return;
    this.console.log(message);
    if (stackTrace) this.console.trace();
  }

  warn(message: any, { stackTrace = false } = {}) {
    if (this.skipped(LogLevel.Warn)) return;
    this.console.warn(message);
    if (stackTrace) this.console.trace();
  }

  error(message: any | any[]) {
    if (this.skipped(LogLevel.Error)) return;
    this.console.error(message);
  }
}

let _console = (typeof console === 'undefined') ? new NullConsole() : console;

const ALWAYS = new Logger({ console: _console, level: LogLevel.Trace });
const LOG_LEVEL = LogLevel.Warn;

export default new Logger({ console: _console, level: LOG_LEVEL });