declare module '@ember/runloop/-private/types' {
  export type EmberRunQueues =
    | 'sync'
    | 'actions'
    | 'routerTransitions'
    | 'render'
    | 'afterRender'
    | 'destroy';
}
