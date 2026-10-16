import type { TitleInfo } from './types';

/*
 * Future: auto-detect what's playing from system audio and log it.
 * A detector calls onDetect when it recognizes a movie or series.
 * Browsers can't hear system audio, so a real detector will live in the
 * desktop/mobile build (e.g. Electron or a native app) and plug in here.
 */
export type Detection = TitleInfo;

export interface WatchDetector {
  start(onDetect: (d: Detection) => void): void;
  stop(): void;
}

// Placeholder so the app can wire a detector in today.
export const noopDetector: WatchDetector = {
  start() {},
  stop() {},
};
