import { use } from "react";

/**
 * App Router の page で渡る params は、環境・Next の版によって
 * `Promise<T>` または同期の `T` のどちらかになることがある。
 * `React.use()` は Promise 以外を受け取ると例外になるため、常に Promise 化してから unwrap する。
 */
export function useRouteParams<T extends Record<string, string | string[] | undefined>>(
  params: Promise<T> | T
): T {
  return use(Promise.resolve(params));
}
