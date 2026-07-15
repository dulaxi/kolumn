import { X } from '@phosphor-icons/react'
import { showToast } from '../../../utils/toast'

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function CardFiles({ cardId, attachmentItems, getAttachmentUrl, deleteAttachment }) {
  if (!attachmentItems || attachmentItems.length === 0) return null

  const openFile = async (storage_path) => {
    try {
      const url = await getAttachmentUrl(storage_path)
      if (url) window.open(url, '_blank')
    } catch {
      showToast.error('Failed to open file')
    }
  }

  const handleDelete = async (e, fileId, storagePath) => {
    e.stopPropagation()
    try {
      await deleteAttachment(cardId, fileId, storagePath)
    } catch {
      showToast.error('Failed to delete')
    }
  }

  return (
    <div className="w-full py-4 mt-4 border-t-0.5 border-[var(--border-subtle)]">
      <div className="h-6 w-full flex flex-row items-center justify-between gap-4 mb-1">
        <h3 className="text-[var(--text-secondary)] text-sm font-semibold">Files</h3>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mt-3">
        {attachmentItems.map((file) => {
          const ext = (file.file_name || '').split('.').pop()?.toLowerCase() || 'file'
          return (
            <li key={file.id} className="relative group/file">
              <button
                type="button"
                onClick={() => openFile(file.storage_path)}
                className="w-full rounded-lg text-left block cursor-pointer transition-all border border-[var(--color-sand)] flex flex-col justify-between gap-2.5 overflow-hidden px-2.5 py-2 bg-[var(--surface-card)] hover:border-[var(--color-mist)] shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_2px_6px_rgba(0,0,0,0.04)]"
                style={{ height: 120, minWidth: '100%' }}
                aria-label={`${file.file_name}, ${ext}`}
              >
                <div className="flex flex-col gap-1 min-h-0">
                  <h3 className="text-[12px] break-words text-[var(--text-primary)] line-clamp-3">
                    {file.file_name}
                  </h3>
                  {file.file_size > 0 && (
                    <p className="text-[10px] line-clamp-1 break-words text-[var(--text-faint)]">
                      {formatFileSize(file.file_size)}
                    </p>
                  )}
                </div>
                <div>
                  <div className="relative flex flex-row items-center gap-1 justify-between">
                    <div className="flex flex-row gap-1 shrink min-w-0">
                      <div className="min-w-0 h-[18px] flex flex-row items-center justify-center gap-0.5 px-1 border-0.5 border-[var(--border-default)] shadow-sm rounded bg-[var(--surface-card)] font-medium">
                        <p className="uppercase truncate text-[var(--text-secondary)] text-[11px] leading-[13px]">{ext}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(e, file.id, file.storage_path)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--surface-card)] border-0.5 border-[var(--border-default)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--label-red-text)] hover:bg-[var(--surface-hover)] opacity-0 group-hover/file:opacity-100 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
