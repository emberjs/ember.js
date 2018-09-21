declare const Logger: {
  log(...args: any[]): void,
  warn(...args: any[]): void,
  error(...args: any[]): void,
  info(...args: any[]): void,
  debug(...args: any[]): void,
  assert(...args: any[]): void,
}

export default Logger;