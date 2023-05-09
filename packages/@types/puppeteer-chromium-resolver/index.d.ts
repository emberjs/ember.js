import type { launch } from 'puppeteer';

interface Resolved {
  puppeteer: { launch: typeof launch };
  executablePath: string;
}

declare const pcr: (options: {}) => Promise<Resolved>;

export default pcr;
