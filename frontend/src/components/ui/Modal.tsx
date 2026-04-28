'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'oklch(0 0 0 / 0.65)', backdropFilter: 'blur(4px)' }}
        >
          <Dialog.Content
            className={cn('relative w-full rounded-xl border shadow-lg overflow-hidden', SIZES[size])}
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--color-divider)' }}>
              <div>
                <Dialog.Title className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                onClick={onClose}
                className="ml-4 p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <X size={15} />
              </Dialog.Close>
            </div>
            <div className="p-5 overflow-y-auto max-h-[80vh]">{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
