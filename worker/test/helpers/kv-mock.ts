/* Minimal in-memory KVNamespace covering only what the worker uses. */
export function makeKvMock() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string): Promise<string | null> {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
  } as unknown as KVNamespace & { store: Map<string, string> };
}
