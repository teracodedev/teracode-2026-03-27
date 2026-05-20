import { use } from "react";

/**
 * App Router の page で渡る params は、環境・Next の版によって
 * `Promise<T>` または同期の `T` のどちらかになることがある。
 * `React.use()` は Promise 以外を受け取ると例外になるが、
 * 毎レンダーで新しい Promise を作ると use() が不安定になるため、種別で分岐する。
 */
export function useRouteParams<T extends Record<string, string | string[] | undefined>>(
  params: Promise<T> | T
): T {
  if (params instanceof Promise) {
    return use(params);
  }
  return params;
}
