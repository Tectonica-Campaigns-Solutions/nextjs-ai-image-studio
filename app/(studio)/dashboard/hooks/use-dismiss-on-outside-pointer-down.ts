import { useEffect } from "react";

export type UseDismissOnOutsidePointerDownOptions = Readonly<{
  enabled?: boolean;
  refs: Array<React.RefObject<HTMLElement | null>>;
  onDismiss: () => void;
}>;

export function useDismissOnOutsidePointerDown({
  enabled = true,
  refs,
  onDismiss,
}: UseDismissOnOutsidePointerDownOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const clickedInside = refs.some((ref) => ref.current?.contains(target));
      if (!clickedInside) onDismiss();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [enabled, onDismiss, refs]);
}

