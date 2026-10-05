type SupabaseResult = {
  error: unknown;
};

const retryDelays = [250, 750, 1500];

function readErrorField(error: unknown, field: string) {
  if (!error || typeof error !== "object" || !(field in error)) return undefined;
  return error[field as keyof typeof error];
}

export function isRetryableSupabaseError(error: unknown) {
  const status = Number(readErrorField(error, "status"));
  const code = String(readErrorField(error, "code") ?? "");
  const name = String(readErrorField(error, "name") ?? "");
  const message = String(readErrorField(error, "message") ?? "").toLowerCase();

  return (
    status === 429 ||
    (status >= 500 && status < 600) ||
    name === "AuthRetryableFetchError" ||
    code === "57014" ||
    code === "PGRST002" ||
    code.startsWith("PGRST0") ||
    /fetch|network|timeout|timed out|connection|gateway|unavailable|cloudflare/.test(
      message,
    )
  );
}

export function isUnauthenticatedSupabaseError(error: unknown) {
  const status = Number(readErrorField(error, "status"));
  const name = String(readErrorField(error, "name") ?? "");

  return name === "AuthSessionMissingError" || status === 401 || status === 403;
}

export async function withRetry<T>(
  request: () => PromiseLike<T>,
  shouldRetry: (result: T) => boolean = () => false,
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const result = await request();
      if (!shouldRetry(result) || attempt === retryDelays.length) return result;
    } catch (error) {
      if (
        !isRetryableSupabaseError(error) ||
        attempt === retryDelays.length
      ) {
        throw error;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
  }
}

export async function retrySupabaseRequest<T extends SupabaseResult>(
  request: () => PromiseLike<T>,
) {
  return withRetry(
    request,
    (result) =>
      Boolean(result.error) && isRetryableSupabaseError(result.error),
  );
}
