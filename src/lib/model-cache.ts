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
