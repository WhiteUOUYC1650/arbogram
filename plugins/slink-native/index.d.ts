export interface SlinkNativePlugin {
  checkMicrophonePermission(): Promise<{ granted: boolean }>;
  requestMicrophonePermission(): Promise<{ granted: boolean }>;
}

export declare const SlinkNative: SlinkNativePlugin;
