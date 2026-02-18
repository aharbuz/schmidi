/** Shared types between main and renderer processes */

export interface SchmidiAPI {
  platform: NodeJS.Platform;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    schmidiAPI: SchmidiAPI;
  }
}
