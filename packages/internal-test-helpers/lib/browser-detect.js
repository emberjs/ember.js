// `window.ActiveXObject` is "falsey" in IE11 (but not `undefined` or `false`)
// `"ActiveXObject" in window` returns `true` in all IE versions
// only IE11 will pass _both_ of these conditions
export const isIE11 = !window.ActiveXObject && 'ActiveXObject' in window;
