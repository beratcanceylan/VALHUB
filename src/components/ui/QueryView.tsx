import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { AppError } from "@valhub/domain";
import { ErrorState, SkeletonRows, StaleNotice } from "./States";

/**
 * Standard loading / error / stale handling for one query. Content renders whenever data
 * exists (including stale cached data after a failed refresh); errors without data render
 * a local error state — they never take down the rest of the screen.
 */
export function QueryView<T>({
  query,
  children,
  loading,
  compactError,
}: Readonly<{
  query: UseQueryResult<T, AppError>;
  children: (data: T) => ReactNode;
  loading?: ReactNode;
  compactError?: boolean;
}>) {
  if (query.data !== undefined) {
    // Data present but the latest refresh failed: we're showing the cached copy.
    return (
      <>
        {query.isError ? <StaleNotice updatedAt={query.dataUpdatedAt} /> : null}
        {children(query.data)}
      </>
    );
  }
  if (query.isError) {
    const code = query.error instanceof AppError ? query.error.code : "UPSTREAM";
    return <ErrorState code={code} onRetry={() => void query.refetch()} {...(compactError ? { compact: true } : {})} />;
  }
  return <>{loading ?? <SkeletonRows />}</>;
}
