export const TargetActionSupport: any;
export function isArray(arr: any): boolean;
export const ControllerMixin: any;

export function deprecatingAlias(name: string, opts: {
  id: string;
  until: string;
}): any;

export const inject: {
  service(name: string): any;
};

export const FrameworkObject: any;

export const String: {
  dasherize(s: string): string;
  loc(s: string, ...args: string[]): string;
};

export function isEmberArray(arr: any): boolean;

export function _contentFor(proxy: any): any;

export const StringUtils: {
  fmt(s: string, ...args: any[]): string,
  loc(s: string, ...args: any[]): string,
  w(s: string): string[],
  decamelize(s: string): string,
  dasherize(s: string): string,
  camelize(s: string): string,
  classify(s: string): string,
  underscore(s: string): string,
  capitalize(s: string): string
}
