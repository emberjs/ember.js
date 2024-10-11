/* eslint no-cond-assign:0 */
import DebugPort from './debug-port';
import RenderTree from '@ember/debug/ember-inspector-support/libs/render-tree';
import ViewInspection from '@ember/debug/ember-inspector-support/libs/view-inspection';
import bound from '@ember/debug/ember-inspector-support/utils/bound-method';

export default class ViewDebug extends DebugPort {
  viewInspection!: ViewInspection;
  renderTree!: RenderTree;
  private scheduledSendTree: number | null = null;
  lastRightClicked: any;
  get adapter() {
    return this.namespace?.adapter;
  }
  get objectInspector() {
    return this.namespace?.objectInspector;
  }

  static {
    this.prototype.portNamespace = 'view';

    this.prototype.messages = {
      getTree(this: ViewDebug, { immediate }: { immediate: boolean }) {
        this.sendTree(immediate);
      },

      showInspection(this: ViewDebug, { id, pin }: { id: string; pin: boolean }) {
        this.viewInspection.show(id, pin);
      },

      hideInspection(this: ViewDebug) {
        this.viewInspection.hide();
      },

      inspectViews(this: ViewDebug, { inspect }: { inspect: boolean }) {
        if (inspect) {
          this.startInspecting();
        } else {
          this.stopInspecting();
        }
      },

      scrollIntoView(this: ViewDebug, { id }: { id: string }) {
        this.renderTree.scrollIntoView(id);
      },

      inspectElement(this: ViewDebug, { id }: { id: string }) {
        this.renderTree.inspectElement(id);
      },

      contextMenu(this: ViewDebug) {
        let { lastRightClicked } = this;
        this.lastRightClicked = null;
        this.inspectNearest(lastRightClicked);
      },
    };
  }

  init() {
    super.init();

    let renderTree = (this.renderTree = new RenderTree({
      owner: this.getOwner(),
      retainObject: bound(this.objectInspector, this.objectInspector.retainObject),
      releaseObject: bound(this.objectInspector, this.objectInspector.releaseObject),
      inspectNode: bound(this, this.inspectNode),
    }));

    this.viewInspection = new ViewInspection({
      renderTree,
      objectInspector: this.objectInspector,
      didShow: bound(this, this.didShowInspection),
      didHide: bound(this, this.didHideInspection),
      didStartInspecting: bound(this, this.didStartInspecting),
      didStopInspecting: bound(this, this.didStopInspecting),
    });

    this.setupListeners();
  }

  setupListeners() {
    this.lastRightClicked = null;
    this.scheduledSendTree = null;
    window.addEventListener('mousedown', bound(this, this.onRightClick));
    window.addEventListener('resize', bound(this, this.onResize));
  }

  cleanupListeners() {
    this.lastRightClicked = null;

    window.removeEventListener('mousedown', bound(this, this.onRightClick));
    window.removeEventListener('resize', bound(this, this.onResize));

    if (this.scheduledSendTree) {
      window.clearTimeout(this.scheduledSendTree);
      this.scheduledSendTree = null;
    }
  }

  onRightClick(event: MouseEvent) {
    if (event.button === 2) {
      this.lastRightClicked = event.target;
    }
  }

  onResize() {
    // TODO hide or redraw highlight/tooltip
  }

  inspectNearest(node: Node) {
    let renderNode = this.viewInspection.inspectNearest(node);

    if (!renderNode) {
      this.adapter.log('No Ember component found.');
    }
  }

  willDestroy() {
    super.willDestroy();
    this.cleanupListeners();
    this.viewInspection.teardown();
    this.renderTree.teardown();
  }

  /**
   * Opens the "Elements" tab and selects the given DOM node. Doesn't work in all
   * browsers/addons (only in the Chrome and FF devtools addons at the time of writing).
   *
   * @method inspectNode
   * @param  {Node} node The DOM node to inspect
   */
  inspectNode(node: Node) {
    this.adapter.inspectValue(node);
  }

  sendTree(immediate = false) {
    if (immediate) {
      this.send();
      return;
    }

    if (this.scheduledSendTree) {
      return;
    }

    this.scheduledSendTree = window.setTimeout(() => {
      this.send();
      this.scheduledSendTree = null;
    }, 250);
  }

  send() {
    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    this.sendMessage('renderTree', {
      tree: this.renderTree.build(),
    });
  }

  startInspecting() {
    this.viewInspection.start();
  }

  stopInspecting() {
    this.viewInspection.stop();
  }

  didShowInspection(id: string, pin: boolean) {
    if (pin) {
      this.sendMessage('inspectComponent', { id });
    } else {
      this.sendMessage('previewComponent', { id });
    }
  }

  didHideInspection(id: string, pin: boolean) {
    this.sendMessage('cancelSelection', { id, pin });
  }

  didStartInspecting() {
    this.sendMessage('startInspecting', {});
  }

  didStopInspecting() {
    this.sendMessage('stopInspecting', {});
  }

  getOwner() {
    return this.namespace?.owner;
  }
}
