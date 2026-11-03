/**
 * The one way the client talks to the Worker.
 *
 * Same origin, always JSON, and every failure carries the `requestId` the
 * server logged — so "something went wrong" on screen can be matched to the
 * actual error without the actual error ever being sent to the browser.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly requestId: string | undefined,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; fields?: Record<string, string> };
  requestId?: string;
}

const authenticationError = (requestId?: string) =>
  new ApiError(
    "UNAUTHORIZED",
    "ログインの有効期限が切れています。再ログインしてください。",
    requestId,
  );

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      // Access's cookie rides along; nothing else does.
      credentials: "same-origin",
      // An expired Access session redirects to a different origin. Following
      // that redirect fails CORS and hides the reason behind "Failed to fetch".
      redirect: "manual",
    });
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      "通信できませんでした。ネットワーク接続を確認して、再読み込みしてください。",
      undefined,
    );
  }

  if (response.type === "opaqueredirect") {
    throw authenticationError();
  }

  let envelope: Envelope<T>;
  try {
    envelope = (await response.json()) as Envelope<T>;
  } catch {
    if (response.status === 401) {
      throw authenticationError(response.headers.get("X-Request-Id") ?? undefined);
    }
    throw new ApiError("INTERNAL_ERROR", "応答を読み取れませんでした。", undefined);
  }

  if (response.status === 401) {
    throw authenticationError(envelope.requestId);
  }

  if (!response.ok || !envelope.ok) {
    throw new ApiError(
      envelope.error?.code ?? "INTERNAL_ERROR",
      envelope.error?.message ?? "問題が発生しました。",
      envelope.requestId,
      envelope.error?.fields,
    );
  }
  return envelope.data as T;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return (
    failureCount < 2 &&
    !(error instanceof ApiError && ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND"].includes(error.code))
  );
}

export const api = {
  get: <T>(path: string) => call<T>(path),
  post: <T>(path: string, body: unknown) =>
    call<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) =>
    call<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body: unknown) =>
    call<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => call<T>(path, { method: "DELETE" }),
};

export function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const rendered = search.toString();
  return rendered ? `?${rendered}` : "";
}
