import hasDom from './lib/has-dom';

declare const InstallTrigger: unknown;
declare const chrome: unknown;
declare const opera: unknown;

export { default as hasDOM } from './lib/has-dom';
export const window = hasDom ? self : null;
export const location = hasDom ? self.location : null;
export const history = hasDom ? self.history : null;
export const userAgent = hasDom ? self.navigator.userAgent : 'Lynx (textmode)';
export const isChrome = hasDom ? typeof chrome === 'object' && !(typeof opera === 'object') : false;
export const isFirefox = hasDom ? typeof InstallTrigger !== 'undefined' : false;
