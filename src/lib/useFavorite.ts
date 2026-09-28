import { useCallback, useState } from "react";
import type { FavoriteEntityType } from "@valhub/domain";
import { favorites } from "@/data/repositories/library";

/** Reactive favorite toggle backed by local SQLite. */
export function useFavorite(type: FavoriteEntityType, entityId: string, label?: string) {
  const [saved, setSaved] = useState(() => favorites.has(type, entityId));
  const toggle = useCallback(() => {
    if (favorites.has(type, entityId)) {
      favorites.remove(type, entityId);
      setSaved(false);
      return false;
    }
    favorites.add(type, entityId, label);
    setSaved(true);
    return true;
  }, [type, entityId, label]);
  return { saved, toggle };
}
