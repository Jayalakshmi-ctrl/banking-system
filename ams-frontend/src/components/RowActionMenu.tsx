import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface RowActionMenuItem {
  label: string;
  onSelect: () => void | Promise<void>;
}

interface Props {
  ariaLabel: string;
  items: RowActionMenuItem[];
}

const PANEL_MIN_WIDTH = 200;

export function RowActionMenu({ ariaLabel, items }: Props) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const selectInFlightRef = useRef(false);
  const [panelPos, setPanelPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setPanelPos(null);
      return;
    }
    const r = triggerRef.current.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, r.right - PANEL_MIN_WIDTH),
      window.innerWidth - PANEL_MIN_WIDTH - 8,
    );
    const top = r.bottom + 6;
    setPanelPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDownCapture(e: PointerEvent) {
      const el = e.target as Node;
      if (triggerRef.current?.contains(el)) return;
      if (panelRef.current?.contains(el)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDownCapture, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  if (items.length === 0) {
    return null;
  }

  const panel =
    open && panelPos ? (
      <ul
        ref={panelRef}
        id={menuId}
        className="row-action-menu-panel"
        role="menu"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: panelPos.top,
          left: panelPos.left,
          minWidth: PANEL_MIN_WIDTH,
          zIndex: 1000,
        }}
      >
        {items.map((item) => (
          <li key={item.label} role="none">
            <button
              type="button"
              role="menuitem"
              className="row-action-menu-item"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (selectInFlightRef.current) {
                  return;
                }
                selectInFlightRef.current = true;
                setOpen(false);
                queueMicrotask(() => {
                  void (async () => {
                    try {
                      await Promise.resolve(item.onSelect());
                    } finally {
                      selectInFlightRef.current = false;
                    }
                  })().catch(() => {
                    /* Errors are handled by page state (e.g. setErr); avoid unhandled rejection */
                  });
                });
              }}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div className="row-action-menu">
      <button
        ref={triggerRef}
        type="button"
        className="row-action-menu-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="row-action-menu-icon" aria-hidden>
          ⋮
        </span>
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
