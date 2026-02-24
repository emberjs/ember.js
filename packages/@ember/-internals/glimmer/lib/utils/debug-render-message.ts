let debugRenderMessage: undefined | ((renderingStack: string) => string);

if (import.meta.env?.DEV) {
  debugRenderMessage = (renderingStack: string) => {
    return `While rendering:\n----------------\n${renderingStack.replace(/^/gm, '  ')}`;
  };
}

export default debugRenderMessage;
