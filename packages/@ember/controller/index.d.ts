export default class Controller {
  isController: true;
  target?: unknown;
  store?: unknown;
  model?: unknown;
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
  setProperties(props: { [key: string]: any }): void;
}

export function inject(name?: string): any;
