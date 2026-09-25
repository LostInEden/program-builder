import type { PersistStorage, StorageValue } from "zustand/middleware";

export type SaveStatus = "ready" | "saving" | "saved" | "error";

// Report success only after the browser accepts the complete persisted state.
export function createDeviceStorage<T>(
  getStorage: () => Pick<Storage, "getItem" | "setItem" | "removeItem">,
  report: (status: SaveStatus) => void,
): PersistStorage<T> {
  return {
    getItem(name) {
      try {
        const raw = getStorage().getItem(name);
        const value = raw === null ? null : JSON.parse(raw) as StorageValue<T>;
        report(value ? "saved" : "ready");
        return value;
      } catch (error) {
        report("error");
        throw error;
      }
    },
    setItem(name, value) {
      report("saving");
      try {
        getStorage().setItem(name, JSON.stringify(value));
        report("saved");
      } catch {
        // Keep edits in memory so the coach can recover without losing the open play.
        report("error");
      }
    },
    removeItem(name) {
      try {
        getStorage().removeItem(name);
        report("ready");
      } catch (error) {
        report("error");
        throw error;
      }
    },
  };
}
