const _listeners = new Map();

export const bus = {
  on(ev, fn) {
    if (!_listeners.has(ev)) _listeners.set(ev, new Set());
    _listeners.get(ev).add(fn);
  },
  off(ev, fn) {
    _listeners.get(ev)?.delete(fn);
  },
  emit(ev, payload) {
    const set = _listeners.get(ev);
    if (!set) return;
    [...set].forEach(fn => { try { fn(payload); } catch (e) { console.warn(e); } });
  },
  removeAll(ev) {
    if (ev) _listeners.delete(ev); else _listeners.clear();
  },
};