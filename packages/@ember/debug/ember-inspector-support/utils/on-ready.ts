export function onReady(callback: () => void) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(completed);
  } else {
    document.addEventListener('DOMContentLoaded', completed, false);
    // For some reason DOMContentLoaded doesn't always work
    window.addEventListener('load', completed, false);
  }

  function completed() {
    document.removeEventListener('DOMContentLoaded', completed, false);
    window.removeEventListener('load', completed, false);
    callback();
  }
}
