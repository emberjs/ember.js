import hasDom from './lib/has-dom';

declare const InstallTrigger: any;

export { default as hasDOM } from './lib/has-dom';
export const window = hasDom ? self : null;
export const location = hasDom ? self.location : null;
export const history = hasDom ? self.history : null;
export const userAgent = hasDom ? self.navigator.userAgent : 'Lynx (textmode)';
export const isChrome = hasDom ? Boolean((window as any).chrome) && !(window as any).opera : false;
export const isFirefox = hasDom ? typeof InstallTrigger !== 'undefined' : false;
