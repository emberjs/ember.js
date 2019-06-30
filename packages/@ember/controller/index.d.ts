export default interface Controller {
  isController: true;
  target?: unknown;
  store?: unknown;
  model?: unknown;
}

export function inject(name?: string): Controller;
