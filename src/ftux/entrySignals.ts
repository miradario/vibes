/**
 * How the app was entered this session, so the FTUX never interrupts a push
 * notification or a (deferred) deep link. Written from App.tsx, read by
 * components/ftux/FtuxGuide.tsx through `canShowWelcome`.
 */
const bootAt = Date.now();
let externalEntryAt: number | null = null;
let deferredLinkSettled = false;
let pendingExternalProbe: () => boolean = () => false;

/** A notification tap, universal link or deferred link is taking the user somewhere. */
export const markFtuxExternalEntry = () => {
  externalEntryAt = Date.now();
};

/** The one-time deferred deep link check finished (with or without a destination). */
export const markFtuxDeferredLinkSettled = () => {
  deferredLinkSettled = true;
};

/** App.tsx tells us whether a notification/deferred navigation is still queued. */
export const setFtuxPendingExternalProbe = (probe: () => boolean) => {
  pendingExternalProbe = probe;
};

export const getFtuxEntrySnapshot = () => {
  let pendingExternal = false;
  try {
    pendingExternal = pendingExternalProbe();
  } catch {
    pendingExternal = false;
  }
  return { bootAt, externalEntryAt, deferredLinkSettled, pendingExternal };
};
