import { createCore } from "@valhub/core";

/** Single in-process instance: one shared TTL cache and rate limiter set for the app's lifetime. */
export const core = createCore();
