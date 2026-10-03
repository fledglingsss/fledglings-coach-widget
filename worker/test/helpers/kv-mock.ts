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
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    /* Everything comes back in one page, and says so - as the real
     * store does when there is nothing more to fetch. */
    async list(options?: {
      prefix?: string;
    }): Promise<{ keys: Array<{ name: string }>; list_complete: true }> {
      const prefix = options?.prefix ?? "";
      return {
        keys: [...store.keys()]
          .filter((name) => name.startsWith(prefix))
          .map((name) => ({ name })),
        list_complete: true,
      };
    },
  } as unknown as KVNamespace & { store: Map<string, string> };
}
