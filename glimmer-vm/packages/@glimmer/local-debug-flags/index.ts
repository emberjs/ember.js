/* eslint-disable no-console */

declare global {
  interface ImportMetaEnv {
    VM_LOCAL_DEV?: boolean;
  }
}

// All of these flags are expected to become constant `false` in production builds.
export const LOCAL_DEBUG = !!(import.meta.env?.VM_LOCAL_DEV && !hasFlag('disable_local_debug'));
export const LOCAL_TRACE_LOGGING = !!(
  import.meta.env?.VM_LOCAL_DEV && hasFlag('enable_trace_logging')
);
export const LOCAL_EXPLAIN_LOGGING =
  import.meta.env?.VM_LOCAL_DEV && hasFlag('enable_trace_explanations');
export const LOCAL_INTERNALS_LOGGING =
  import.meta.env?.VM_LOCAL_DEV && hasFlag('enable_internals_logging');
export const LOCAL_SUBTLE_LOGGING =
  import.meta.env?.VM_LOCAL_DEV && hasFlag('enable_subtle_logging');

if (LOCAL_INTERNALS_LOGGING || LOCAL_EXPLAIN_LOGGING) {
  console.group('%cLogger Flags:', 'font-weight: normal; color: teal');
  log(
    'LOCAL_DEBUG',
    LOCAL_DEBUG,
    'Enables debug logging for people working on this repository. If this is off, none of the other flags will do anything.'
  );
  log(
    'LOCAL_TRACE_LOGGING',
    LOCAL_TRACE_LOGGING,
    `Enables trace logging. This is most useful if you're working on the internals, and includes a trace of compiled templates and a trace of VM execution that includes state changes. If you want to see all of the state, enable LOCAL_SUBTLE_LOGGING.`
  );
  log(
    'LOCAL_EXPLAIN_LOGGING',
    LOCAL_EXPLAIN_LOGGING,
    'Enables trace explanations (like this one!)'
  );
  log(
    'LOCAL_INTERNALS_LOGGING',
    LOCAL_INTERNALS_LOGGING,
    `Enables logging of internal state. This is most useful if you're working on the debug infrastructure itself.`
  );
  log(
    'LOCAL_SUBTLE_LOGGING',
    LOCAL_SUBTLE_LOGGING,
    'Enables more complete logging, even when the result would be extremely verbose and not usually necessary. Subtle logs are dimmed when enabled.'
  );
  log(
    'audit_logging',
    getFlag('audit_logging'),
    'Enables specific audit logs. These logs are useful during an internal refactor and can help pinpoint exactly where legacy code is being used.'
  );
  log(
    'focus_highlight',
    getFlag('focus_highlight'),
    `Enables focus highlighting of specific trace logs. This makes it easy to see specific aspects of the trace at a glance.`
  );
  console.log();
  console.groupEnd();

  function log(
    flag: string,
    value: boolean | string | string[] | null | undefined,
    explanation: string
  ) {
    const { formatted, style } = format(value);

    const header = [
      `%c[${flag}]%c %c${formatted}`,
      `font-weight: normal; background-color: ${style}; color: white`,
      ``,
      `font-weight: normal; color: ${style}`,
    ];

    if (LOCAL_EXPLAIN_LOGGING) {
      console.group(...header);
      console.log(`%c${explanation}`, 'color: grey');
      console.groupEnd();
    } else {
      console.log(...header);
    }
  }

  function format(flagValue: boolean | string | string[] | null | undefined): {
    formatted: string;
    style: string;
  } {
    if (flagValue === null || flagValue === undefined || flagValue === false) {
      return { formatted: 'off', style: 'grey' };
    } else if (flagValue === true) {
      return { formatted: 'on', style: 'green' };
    } else if (typeof flagValue === 'string') {
      return { formatted: flagValue, style: 'blue' };
    } else if (Array.isArray(flagValue)) {
      if (flagValue.length === 0) {
        return { formatted: 'none', style: 'grey' };
      }
      return { formatted: `[${flagValue.join(', ')}]`, style: 'teal' };
    } else {
      assertNever(flagValue);
    }
  }

  function assertNever(_never: never): never {
    throw new Error('unreachable');
  }
}

// This function should turn into a constant `return false` in `import.meta.env?.PROD`,
// which should inline properly via terser, swc and esbuild.
//
// https://tiny.katz.zone/BNqN3F
function hasFlag(flag: string): true | false {
  if (import.meta.env?.VM_LOCAL_DEV) {
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;

    return url?.searchParams.has(flag) ?? false;
  } else {
    return false;
  }
}

if (import.meta.env?.VM_LOCAL_DEV) {
  if ('stackTraceLimit' in Error) {
    Error.stackTraceLimit = Infinity;
  }
}

/**
 * If the specified flag is set as a boolean flag with no value, `true` is returned.
 *
 * Otherwise, this function returns true if the flag value is a pattern that matches `value`.
 *
 * The pattern can have a `*`, which matches any number of characters.
 */
export function hasFlagWith(flag: string, value: string): boolean {
  if (import.meta.env?.VM_LOCAL_DEV) {
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;

    const pattern = new RegExp(`^${value.replace(/\*/gu, '.*')}$`, 'u');

    return url?.searchParams.getAll(flag).some((param) => pattern.test(param)) ?? false;
  } else {
    return false;
  }
}

export function getFlagValues(flag: string): string[] {
  if (import.meta.env?.VM_LOCAL_DEV) {
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;

    const all = url?.searchParams.getAll(flag);
    return all?.filter((a) => a !== '') ?? [];
  } else {
    return [];
  }
}

export function getFlag(flag: string): boolean | string | string[] | null {
  if (import.meta.env?.VM_LOCAL_DEV) {
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;

    const all = url?.searchParams.getAll(flag);

    if (all) {
      if (all.length === 1) {
        return all[0] === '' ? true : (all[0] ?? null);
      } else {
        return all;
      }
    }

    return null;
  } else {
    return null;
  }
}
