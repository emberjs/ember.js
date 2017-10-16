declare module 'ember-metal' {
  export const run: { [key: string]: any };

  export function setHasViews(fn: () => boolean): null;

  export function runInTransaction(context: any, methodName: string): any;
}