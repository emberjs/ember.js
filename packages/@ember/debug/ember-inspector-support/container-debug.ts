import DebugPort from './debug-port';

export default class ContainerDebug extends DebugPort {
  objectToConsole: any;
  get objectInspector() {
    return this.namespace?.objectInspector;
  }

  get container() {
    return this.namespace?.owner?.__container__;
  }

  TYPES_TO_SKIP = [
    'component-lookup',
    'container-debug-adapter',
    'resolver-for-debugging',
    'event_dispatcher',
  ];

  static {
    this.prototype.portNamespace = 'container';
    this.prototype.messages = {
      getTypes(this: ContainerDebug) {
        this.sendMessage('types', {
          types: this.getTypes(),
        });
      },
      getInstances(this: ContainerDebug, message: any) {
        let instances = this.getInstances(message.containerType);
        if (instances) {
          this.sendMessage('instances', {
            instances,
            status: 200,
          });
        } else {
          this.sendMessage('instances', {
            status: 404,
          });
        }
      },
      sendInstanceToConsole(this: ContainerDebug, message: any) {
        const instance = this.container.lookup(message.name);
        this.objectToConsole.sendValueToConsole(instance);
      },
    };
  }

  typeFromKey(key: string) {
    return key.split(':').shift()!;
  }

  nameFromKey(key: string) {
    return key.split(':').pop();
  }

  shouldHide(type: string) {
    return type[0] === '-' || this.TYPES_TO_SKIP.indexOf(type) !== -1;
  }

  instancesByType() {
    let key;
    let instancesByType: Record<string, any> = {};
    let cache = this.container.cache;
    // Detect if InheritingDict (from Ember < 1.8)
    if (typeof cache.dict !== 'undefined' && typeof cache.eachLocal !== 'undefined') {
      cache = cache.dict;
    }
    for (key in cache) {
      const type = this.typeFromKey(key);
      if (this.shouldHide(type)) {
        continue;
      }
      if (instancesByType[type] === undefined) {
        instancesByType[type] = [];
      }
      instancesByType[type].push({
        fullName: key,
        instance: cache[key],
      });
    }
    return instancesByType;
  }

  getTypes() {
    let key;
    let types = [];
    const instancesByType = this.instancesByType();
    for (key in instancesByType) {
      types.push({ name: key, count: instancesByType[key].length });
    }
    return types;
  }

  getInstances(type: any) {
    const instances = this.instancesByType()[type];
    if (!instances) {
      return null;
    }
    return instances.map((item: any) => ({
      name: this.nameFromKey(item.fullName),
      fullName: item.fullName,
      inspectable: this.objectInspector.canSend(item.instance),
    }));
  }
}
