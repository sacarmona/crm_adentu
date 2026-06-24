const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function retryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return 500 * 2 ** attempt;
}

export async function fetchProviderWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: { attempts?: number; sleep?: (milliseconds: number) => Promise<void> } = {},
) {
  const attempts = options.attempts ?? 4;
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(input, init);
    if (
      response.ok ||
      !RETRYABLE_STATUSES.has(response.status) ||
      attempt === attempts - 1
    ) {
      return response;
    }
    await sleep(retryDelay(response, attempt));
  }

  throw new Error("No fue posible completar la solicitud al proveedor.");
}

export async function mapInBatches<T, R>(
  values: T[],
  batchSize: number,
  mapper: (value: T) => Promise<R>,
  pause?: (milliseconds: number) => Promise<void>,
) {
  const results: R[] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    results.push(
      ...(await Promise.all(values.slice(index, index + batchSize).map(mapper))),
    );
    if (index + batchSize < values.length) {
      await (pause ??
        ((milliseconds: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, milliseconds))))(250);
    }
  }
  return results;
}
