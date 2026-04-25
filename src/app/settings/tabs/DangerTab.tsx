'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Btn } from '@/components/ui/Btn'
import { Card } from '@/components/ui/Card'

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------

function emitToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const variant = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'
  window.dispatchEvent(new CustomEvent('servant:toast', { detail: { message, variant } }))
}

// ---------------------------------------------------------------------------
// Confirm Row — two-click pattern
// ---------------------------------------------------------------------------

interface ConfirmRowProps {
  label: string
  description: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
}

function ConfirmRow({ label, description, confirmLabel = label, onConfirm }: ConfirmRowProps) {
  const [pending, setPending] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const handleFirstClick = () => {
    setAwaitingConfirm(true)
  }

  const handleConfirmClick = async () => {
    setPending(true)
    setAwaitingConfirm(false)
    try {
      await onConfirm()
    } finally {
      setPending(false)
    }
  }

  const handleCancel = () => {
    setAwaitingConfirm(false)
  }

  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-[color:var(--border)] last:border-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {label}
        </span>
        <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
          {description}
        </span>
        {awaitingConfirm && (
          <span
            className="text-xs font-medium mt-1"
            style={{ color: 'var(--bad)' }}
            role="status"
            aria-live="polite"
          >
            Are you sure? Click again to confirm.
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {awaitingConfirm ? (
          <>
            <Btn variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Btn>
            <Btn variant="danger" size="sm" onClick={handleConfirmClick} disabled={pending}>
              {pending ? 'Working…' : `Confirm: ${confirmLabel}`}
            </Btn>
          </>
        ) : (
          <Btn variant="danger" size="sm" onClick={handleFirstClick} disabled={pending}>
            {label}
          </Btn>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete All Data — requires typing "DELETE"
// ---------------------------------------------------------------------------

function DeleteAllDataRow() {
  const [showModal, setShowModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pending, setPending] = useState(false)

  const handleOpen = () => {
    setShowModal(true)
    setConfirmText('')
  }

  const handleClose = () => {
    setShowModal(false)
    setConfirmText('')
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      emitToast('Type DELETE to confirm', 'error')
      return
    }
    setPending(true)
    try {
      const res = await fetch('/api/admin/wipe', { method: 'DELETE' })
      if (res.status === 501) {
        emitToast('Not implemented — contact support', 'info')
      } else if (!res.ok) {
        emitToast(`Error: HTTP ${res.status}`, 'error')
      } else {
        emitToast('All data wiped.', 'success')
      }
    } finally {
      setPending(false)
      handleClose()
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          Delete all data
        </span>
        <span className="text-xs" style={{ color: 'var(--ink-dim)' }}>
          Irreversibly destroys all recordings, questions, feedback, cards, and settings.
        </span>
      </div>
      <Btn variant="danger" size="sm" onClick={handleOpen}>
        Delete all data
      </Btn>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div
            className="relative z-10 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-xl max-w-md w-full mx-4"
          >
            <h2
              id="delete-modal-title"
              className="text-base font-semibold mb-2"
              style={{ color: 'var(--bad)' }}
            >
              Delete all data
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ink-dim)' }}>
              This action cannot be undone. Type{' '}
              <span className="font-mono font-semibold" style={{ color: 'var(--bad)' }}>
                DELETE
              </span>{' '}
              to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              aria-label="Type DELETE to confirm data wipe"
              className="w-full rounded border border-[color:var(--border)] bg-[color:var(--canvas)] text-[color:var(--ink)] px-2.5 py-1.5 text-sm mb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--bad)]"
            />
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || pending}
                aria-disabled={confirmText !== 'DELETE'}
              >
                {pending ? 'Deleting…' : 'Delete all data'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DangerTab
// ---------------------------------------------------------------------------

export function DangerTab() {
  const router = useRouter()

  return (
    <div
      className="flex flex-col gap-5"
      role="tabpanel"
      id="tabpanel-danger"
      aria-labelledby="tab-danger"
    >
      <Card>
        <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--bad)' }}>
          Danger Zone
        </h2>

        <ConfirmRow
          label="Reset study hours"
          description="Clears all stored study hours data."
          onConfirm={async () => {
            const res = await fetch('/api/settings/study-hours', { method: 'DELETE' })
            if (!res.ok) {
              emitToast(`Failed: HTTP ${res.status}`, 'error')
              return
            }
            emitToast('Study hours reset.', 'success')
            router.push('/')
          }}
        />

        <ConfirmRow
          label="Wipe all Anki cards"
          description="Permanently deletes every flashcard and review history."
          onConfirm={async () => {
            const res = await fetch('/api/anki/all', { method: 'DELETE' })
            if (!res.ok) {
              emitToast(`Failed: HTTP ${res.status}`, 'error')
              return
            }
            const data = await res.json() as { deleted: number }
            emitToast(`Deleted ${data.deleted} Anki cards.`, 'success')
          }}
        />

        <ConfirmRow
          label="Re-index all textbooks"
          description="Resets all textbooks to QUEUED and re-triggers indexing for each."
          onConfirm={async () => {
            const res = await fetch('/api/textbooks/reindex-all', { method: 'POST' })
            if (!res.ok) {
              emitToast(`Failed: HTTP ${res.status}`, 'error')
              return
            }
            const data = await res.json() as { queued: number }
            emitToast(`${data.queued} textbooks queued for re-indexing.`, 'success')
          }}
        />

        <ConfirmRow
          label="Clear model call history"
          description="Deletes all model call logs and resets budget usage to $0.00."
          onConfirm={async () => {
            const res = await fetch('/api/settings/model-calls', { method: 'DELETE' })
            if (!res.ok) {
              emitToast(`Failed: HTTP ${res.status}`, 'error')
              return
            }
            const data = await res.json() as { deleted: number }
            emitToast(`Cleared ${data.deleted} model call records. Budget reset to $0.`, 'success')
          }}
        />

        <DeleteAllDataRow />
      </Card>
    </div>
  )
}
