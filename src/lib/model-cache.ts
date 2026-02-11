/**
 * Checks if a HuggingFace model has been cached in the browser's Cache API.
 *
 * @huggingface/transformers stores downloaded files via the Cache API under
 * their full HuggingFace Hub URLs (e.g. https://huggingface.co/{model_id}/resolve/main/{file}).
 * We probe for config.json which every model has — if it's cached, the rest
 * of the model files almost certainly are too.
 */
export async function isModelCached(modelId: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;

  try {
    // The library caches under the full HF URL for each file.
    // config.json is always the first file fetched for any model.
    const testUrl = `https://huggingface.co/${modelId}/resolve/main/config.json`;
    const match = await caches.match(testUrl);
    return match !== undefined;
  } catch {
    return false;
  }
}

/**
 * Checks cache status for multiple models at once.
 * Returns a Set of model IDs that are cached.
 */
export async function getCachedModelIds(
  modelIds: string[]
): Promise<Set<string>> {
  const cached = new Set<string>();
  const checks = modelIds.map(async (id) => {
    if (await isModelCached(id)) {
      cached.add(id);
    }
  });
  await Promise.all(checks);
  return cached;
}

/**
 * Deletes all Cache API caches used by @huggingface/transformers.
 * The library creates caches named "transformers-cache" (or similar).
 * We delete all caches to be thorough — the browser will recreate them on next download.
 */
export async function clearAllModelCache(): Promise<void> {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

/**
 * Estimates total cache storage used by model files.
 * Returns size in bytes.
 */
export async function estimateCacheSize(): Promise<number> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return 0;
  try {
    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? 0;
  } catch {
    return 0;
  }
}

// ─── Parakeet.js cache (IndexedDB) ──────────────────────────────────
// parakeet.js stores model files in IndexedDB "parakeet-cache-db" / "file-store"
// with keys like "hf-{repoId}-main--{filename}".

const PARAKEET_DB = "parakeet-cache-db";
const PARAKEET_STORE = "file-store";

function openParakeetDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(PARAKEET_DB, 1);
      req.onerror = () => resolve(null);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(PARAKEET_STORE)) {
          db.createObjectStore(PARAKEET_STORE);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Checks whether a parakeet model is cached in IndexedDB.
 * Probes for vocab.txt which is always downloaded.
 */
export async function isParakeetModelCached(repoId: string): Promise<boolean> {
  const db = await openParakeetDb();
  if (!db) return false;

  const key = `hf-${repoId}-main--vocab.txt`;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction([PARAKEET_STORE], "readonly");
      const store = tx.objectStore(PARAKEET_STORE);
      const req = store.count(key);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Checks cache status for multiple parakeet models.
 * Returns a Set of repoIds that are cached.
 */
export async function getCachedParakeetModelIds(
  repoIds: string[]
): Promise<Set<string>> {
  const cached = new Set<string>();
  const checks = repoIds.map(async (id) => {
    if (await isParakeetModelCached(id)) {
      cached.add(id);
    }
  });
  await Promise.all(checks);
  return cached;
}

/**
 * Deletes the parakeet.js IndexedDB cache entirely.
 */
export async function clearParakeetCache(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(PARAKEET_DB);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
