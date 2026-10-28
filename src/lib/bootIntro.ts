// Tiny shared signal: the boot intro overlay fades out once the app reports it is ready.
type Listener = () => void;
let ready = false;
const listeners = new Set<Listener>();
export function markBootIntroReady() {
  if (ready) return;
  ready = true;
  listeners.forEach((listener) => listener());
}
export function isBootIntroReady() {
  return ready;
}
export function subscribeBootIntroReady(listener: Listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
