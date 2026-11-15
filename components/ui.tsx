"use client";

import { Dialog, Toggle as RadixToggle } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

export function Input(props: ComponentProps<"input">) {
  return <input className="query-input" {...props} />;
}

export function Toggle(props: ComponentProps<typeof RadixToggle.Root>) {
  return <RadixToggle.Root className="text-button" {...props} />;
}

export function Sheet({ open, onClose, children, onRestore }: {
  open: boolean; onClose: () => void; children: ReactNode; onRestore: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="sheet" onCloseAutoFocus={event => { event.preventDefault(); onRestore(); }}>
          <div className="sheet-top">
            <Dialog.Title>Source inspector</Dialog.Title>
            <Dialog.Close className="text-button">Close</Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Original source excerpt and publication details.</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
