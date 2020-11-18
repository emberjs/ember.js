declare const Logger: {
  log(...args: string[]): void;
  warn(...args: string[]): void;
  error(...args: string[]): void;
  info(...args: string[]): void;
  debug(...args: string[]): void;
  assert(...args: string[]): void;
};

export default Logger;
