/**
 * A Loggable is either:
 *
 * 1. a single log line
 * 2. a log line as a header followed by a group of log entries
 */
export type Loggable = [LogLine, ...LogEntry[]];

export type LogEntry = LogLine | LogGroup;

/**
 * LogLine represents a single line in the log. The line is logged *either* by passing the `line`
 * values to `console.{log,info,debug,warn,error}` *or* by passing them to `console.group` to
 * represent the header of a group.
 */
export interface LogLine {
  readonly type: 'line';
  readonly line: unknown[];
}

/**
 * LogGroup represents a group of log entries. It is logged by calling *either* `console.group` or
 * `console.groupCollapsed` (depending on the value of `collapsed`).
 */
export interface LogGroup {
  type: 'group';
  collapsed: boolean;
  heading: unknown[];
  children: LogEntry[];
}
