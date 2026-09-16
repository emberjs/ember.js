import type Application from '@ember/application';

export function setupInspectorSupport(app: Application) {
  const g = globalThis as any;
  g.emberInspectorApps = g.emberInspectorApps || [];
  g.emberInspectorApps.push({
    app,
    loadCompatInspector() {
      return import('./api');
    },
  });
}
