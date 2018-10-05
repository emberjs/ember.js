export interface EngineInfo {
  name: string;
  instanceId: number;
  mountPoint: string;
  fullName: string;
}

export interface EngineRouteInfo extends EngineInfo {
  localFullName: string;
  serializeMethod?: any;
}
