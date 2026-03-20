declare module 'rsvp' {
  export interface PromiseConstructor {
    new <T>(
      executor: (
        resolve: (value?: T | PromiseLike<T>) => void,
        reject: (reason?: any) => void
      ) => void
    ): Promise<T>;
    resolve<T>(value: T | PromiseLike<T>, label?: string): Promise<T>;
    reject<T = never>(reason?: any, label?: string): Promise<T>;
    all(values: any[]): Promise<any[]>;
  }

  export const resolve: (value: any | PromiseLike<any>, label?: string) => Promise<any>;
  export const reject: (reason?: any, label?: string) => Promise<any>;
  export const configure: (key: string, value?: any) => void;
  export const Promise: PromiseConstructor;

  export type OnFulfilled<T, TResult1> =
    | ((value: T) => TResult1 | PromiseLike<TResult1>)
    | undefined
    | null;
  export type OnRejected<TResult2> =
    | ((reason: any) => TResult2 | PromiseLike<TResult2>)
    | undefined
    | null;

  export interface Promise<T> extends PromiseLike<T> {
    then<TResult1 = T, TResult2 = never>(
      onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
      label?: string
    ): Promise<TResult1 | TResult2>;
    catch<TResult = never>(
      onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
      label?: string
    ): Promise<T | TResult>;
    finally<U>(onFinally?: U | PromiseLike<U>, label?: string): Promise<T>;
  }
}
