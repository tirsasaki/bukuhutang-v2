type SupabaseResult = {
  error: unknown;
};

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
    status >= 500 ||
    name === "AuthRetryableFetchError" ||
    code.startsWith("PGRST0") ||
    /fetch|network|timeout|timed out|connection/.test(message)
  );
}

export async function retrySupabaseRequest<T extends SupabaseResult>(
  request: () => PromiseLike<T>,
) {
  let result = await request();

  if (result.error && isRetryableSupabaseError(result.error)) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    result = await request();
  }

  return result;
}
