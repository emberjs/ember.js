/**
 * A named alias for `console`,
 * so that normal logs are easy to tell apart from errant console.logs.
 * LOCAL_LOGGER should only be used inside a LOCAL_TRACE_LOGGING check.
 *
 * You still need to check LOCAL_TRACE_LOGGING,
 * because the build uses that check to strip the logging.
 */
export const LOCAL_LOGGER = console;

/**
 * A named alias for `console`,
 * so that normal logs are easy to tell apart from errant console.logs.
 * LOGGER can be used outside of LOCAL_TRACE_LOGGING checks.
 * Use it in the rare situation where a console.* call is appropriate.
 */
export const LOGGER = console;
