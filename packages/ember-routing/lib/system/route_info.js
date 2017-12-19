export const privateRouteInfos = new WeakMap();

export default class RouteInfo {
  constructor(name, controller, template, outletName, into) {
    this.name = name;
    privateRouteInfos.set(this,{
      child: null,
      controller,
      template,
      outletName: outletName || 'main',
      into,
      outlets: null,
      orphanCheck: null
    });
  }

  get child() {
    return privateRouteInfos.get(this).child;
  }

  getChild(name) {
    let priv = privateRouteInfos.get(this);
    if (name === 'main') {
      return priv.child;
    } else {
      let outlets = priv.outlets;
      if (outlets) {
        return outlets[name];
      }
    }
  }

  setChild(name, routeInfo) {
    let priv = privateRouteInfos.get(this);
    if (name === 'main') {
      priv.child = routeInfo;
    } else {
      let outlets = priv.outlets;
      if (!outlets) {
        outlets = priv.outlets = Object.create(null);
      }
      outlets[name] = routeInfo;
    }
  }

  // this is for legacy {{render}} helper support
  checkIfUsed(checker) {
    let priv = privateRouteInfos.get(this);
    priv.orphanCheck = checker;
  }

  // this is for legacy {{render}} helper support
  markAsUsed() {
    let priv = privateRouteInfos.get(this);
    if (priv.orphanCheck) {
      priv.orphanCheck.wasUsed = true;
    }
  }
}
