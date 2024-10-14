import { default as BasicAdapter } from './basic';
import { default as BookmarkletAdapter } from './bookmarklet';
import { default as ChromeAdapter } from './chrome';
import { default as FirefoxAdapter } from './firefox';
import { default as WebsocketAdapter } from './websocket';
import { default as WebExtensionAdapter } from './web-extension';

export default {
  basic: BasicAdapter,
  bookmarklet: BookmarkletAdapter,
  chrome: ChromeAdapter,
  firefox: FirefoxAdapter,
  webExtension: WebExtensionAdapter,
  websocket: WebsocketAdapter,
};
