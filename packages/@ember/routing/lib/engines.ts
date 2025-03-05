export interface EngineInfo {
  name: string;
  instanceId: number;
  mountPoint: string;
  fullName: string;
}

export interface EngineRouteInfo extends EngineInfo {
  localFullName: string;
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  serializeMethod?: (model: {}, params: string[]) => { [key: string]: unknown | undefined };
}
