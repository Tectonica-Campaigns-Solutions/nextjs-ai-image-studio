"use client";

import { useState, useCallback, useEffect } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { reorderAssetsAction } from "@/app/(studio)/dashboard/actions/assets";

/**
 * Provides DnD sensors, a drag-end handler, and optimistically-updated items
 * for sortable asset/frame grids.
 *
 * The hook maintains its own `items` state so that the UI updates immediately
 * on drag. If the server action fails the state reverts to the previous order.
 */
export function useGallerySort<T extends { id: string }>(
  initialItems: T[],
  clientId: string,
  onRefresh: () => void
) {
  const [items, setItems] = useState<T[]>(initialItems);

  // Keep local state in sync whenever the parent refreshes data.
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((a) => a.id === active.id);
      const newIndex = items.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const previousItems = items;
      const reordered = arrayMove(items, oldIndex, newIndex);

      // Apply optimistic update immediately so the UI feels instant.
      setItems(reordered);

      const result = await reorderAssetsAction(
        clientId,
        reordered.map((a) => a.id)
      );
      if (result.error) {
        // Revert to previous order on failure.
        setItems(previousItems);
        toast.error(result.error);
        return;
      }
      toast.success("Order updated");
      onRefresh();
    },
    [items, clientId, onRefresh]
  );

  return { sensors, handleDragEnd, items };
}
