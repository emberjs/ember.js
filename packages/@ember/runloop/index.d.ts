interface IBackburner {
  join(...args: any[]): void;
  on(...args: any[]): void;
  scheduleOnce(...args: any[]): void;
  schedule(queueName: string, target: Object | null, method: Function | string): void;
  ensureInstance(): void;
}

export function run(...args: any[]): any;
export function schedule(...args: any[]): void;
export function later(...args: any[]): void;
export function join(...args: any[]): void;
export const backburner: IBackburner;
export function getCurrentRunLoop(): boolean;
export function bind(...args: any[]): any;
export function cancel(...args: any[]): any;
export function once(...args: any[]): any;
export function scheduleOnce(...args: any[]): any;