import { DEBUG } from '@glimmer/env';

let debugRenderMessage: undefined | ((renderingStack: string) => string);

if (DEBUG) {
  debugRenderMessage = (renderingStack: string) => {
    return `While rendering:\n----------------\n${renderingStack.replace(/^/gm, '  ')}`;
  };
}

export default debugRenderMessage;
