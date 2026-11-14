"use client";

import { Dialog, Toggle as RadixToggle, Tooltip } from "radix-ui";
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

const glossary = {
  SAME: "Smoke and Aerosol Measurement Experiment.",
  "SAME-R": "The reflight of the smoke aerosol experiment.",
  SPICE: "Smoke Point In Co-flow Experiment, a study of when flames start emitting soot.",
  ISS: "International Space Station.",
  Microgravity: "Very low apparent gravity, as experienced in orbit.",
};

export function Glossary() {
  return <Tooltip.Provider delayDuration={180}>
    <div className="glossary" aria-label="Glossary">
      <strong>Terms</strong>
      {Object.entries(glossary).map(([term, meaning]) => <Tooltip.Root key={term}>
        <Tooltip.Trigger asChild><button type="button" className="glossary-term">{term}</button></Tooltip.Trigger>
        <Tooltip.Content className="term-tooltip" aria-label={meaning} sideOffset={6}>{meaning}</Tooltip.Content>
      </Tooltip.Root>)}
    </div>
  </Tooltip.Provider>;
}
