import { useState, useEffect, useRef, useCallback } from 'react';

interface UsePopoverOptions {
  onOpen?: () => void;
  onClose?: () => void;
  focusTrap?: boolean;
  popoverId?: string;
}

interface UsePopoverReturn {
  isOpen: boolean;
  openAbove: boolean;
  toggle: (e?: React.MouseEvent) => void;
  open: () => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  triggerProps: {
    ref: React.RefObject<HTMLButtonElement | null>;
    onClick: (e: React.MouseEvent) => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'dialog';
    'aria-controls'?: string;
  };
  popoverProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    role: 'dialog';
    id?: string;
    className: string;
  };
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function usePopover(options: UsePopoverOptions = {}): UsePopoverReturn {
  const { onOpen, onClose, focusTrap = false, popoverId } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const popoverHeight = popoverRect.height;
    setOpenAbove(spaceBelow < popoverHeight && triggerRect.top > popoverHeight);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
    // Return focus to trigger on close
    triggerRef.current?.focus();
  }, [onClose]);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const toggle = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (isOpen) {
        close();
      } else {
        open();
      }
    },
    [isOpen, close, open],
  );

  // Recalculate position after the popover renders
  useEffect(() => {
    if (isOpen) {
      // Use requestAnimationFrame to measure after render
      const frameId = requestAnimationFrame(calculatePosition);
      return () => cancelAnimationFrame(frameId);
    }
  }, [isOpen, calculatePosition]);

  // Click-outside handler (mousedown + touchstart for mobile)
  useEffect(() => {
    if (!isOpen) return;

    function handleOutside(event: MouseEvent | TouchEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen, close]);

  // Escape key handler (WCAG 2.1)
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Focus trap implementation
  useEffect(() => {
    if (!isOpen || !focusTrap || !popoverRef.current) return;

    // Focus first focusable element inside the popover
    const focusableElements = popoverRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    function handleTabKey(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !popoverRef.current) return;

      const focusable = popoverRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen, focusTrap]);

  const triggerProps = {
    ref: triggerRef,
    onClick: toggle,
    'aria-expanded': isOpen,
    'aria-haspopup': 'dialog' as const,
    ...(popoverId ? { 'aria-controls': popoverId } : {}),
  };

  const popoverProps = {
    ref: popoverRef,
    role: 'dialog' as const,
    ...(popoverId ? { id: popoverId } : {}),
    className: openAbove ? 'bottom-full mb-1' : 'top-full mt-1',
  };

  return {
    isOpen,
    openAbove,
    toggle,
    open,
    close,
    triggerRef,
    popoverRef,
    triggerProps,
    popoverProps,
  };
}
