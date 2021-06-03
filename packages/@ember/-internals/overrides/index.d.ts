type Callback<TArgs extends unknown[], TReturn> = (...args: TArgs) => TReturn;

/**
 * Returns a deprecation message or null to skip the deprecation.
 */
type Handler<TArgs extends unknown[]> = Callback<TArgs, string | null>;
type GlobalAccessHandler = Handler<[]>;
type DotAccessHandler = Handler<[dotKey: string, importKey: string, module: string]>;

export let onEmberGlobalAccess: GlobalAccessHandler | undefined;
export let onComputedDotAccess: DotAccessHandler | undefined;
export let onRunloopDotAccess: DotAccessHandler | undefined;
