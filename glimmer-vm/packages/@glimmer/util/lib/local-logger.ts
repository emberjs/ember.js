/**
 * This constant exists to make it easier to differentiate normal logs from
 * errant console.logs. LOCAL_LOGGER should only be used inside a
 * LOCAL_TRACE_LOGGING check.
 *
 * It does not alleviate the need to check LOCAL_TRACE_LOGGING, which is used
 * for stripping.
 */
export const LOCAL_LOGGER = console;

/**
 * This constant exists to make it easier to differentiate normal logs from
 * errant console.logs. LOGGER can be used outside of LOCAL_TRACE_LOGGING checks,
 * and is meant to be used in the rare situation where a console.* call is
 * actually appropriate.
 */
export const LOGGER = console;
