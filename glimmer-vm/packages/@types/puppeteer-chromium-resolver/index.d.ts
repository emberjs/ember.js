import type { launch } from 'puppeteer';

interface Resolved {
  puppeteer: { launch: typeof launch };
  executablePath: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
declare const pcr: (options: {}) => Promise<Resolved>;

export default pcr;
