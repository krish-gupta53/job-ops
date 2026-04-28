'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm:  'max-w-sm',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-4xl',
};

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full p-6',
            'bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-2xl shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2',
            'max-h-[90vh] overflow-y-auto',
            sizes[size]
          )}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <Dialog.Title className="text-base font-semibold text-[var(--color-text)] font-display">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="text-sm text-[var(--color-text-muted)] mt-1">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                className="ml-4 p-1.5 rounded-lg text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition-all"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
