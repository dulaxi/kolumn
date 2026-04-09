import { useRef, useState } from 'react'
import { Trash2, Paperclip, Download, Upload, File, Image } from 'lucide-react'
import { showToast } from '../../utils/toast'

export default function CardDetailAttachments({
  attachmentItems, uploadAttachment, deleteAttachment, getAttachmentUrl,
  cardId, userId,
}) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  return (
    <div className="px-5 pt-3 pb-3 border-t border-[var(--border-subtle)]">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5" />
          Attachments
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-[11px] font-medium text-[#A8BA32] hover:text-[#A8BA32] disabled:opacity-50"
        >
          <Upload className="w-3 h-3" />
          {uploading ? 'Uploading...' : 'Add file'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > 10 * 1024 * 1024) {
              showToast.error('File must be under 10 MB')
              return
            }
            setUploading(true)
            await uploadAttachment(cardId, file)
            setUploading(false)
            e.target.value = ''
          }}
        />
      </div>
      {(attachmentItems || []).length > 0 && (
        <div className="space-y-1.5">
          {(attachmentItems || []).map((att) => {
            const isImage = att.content_type?.startsWith('image/')
            const sizeStr = att.file_size < 1024
              ? `${att.file_size} B`
              : att.file_size < 1024 * 1024
                ? `${(att.file_size / 1024).toFixed(1)} KB`
                : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`

            return (
              <div key={att.id} className="group flex items-center gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center shrink-0">
                  {isImage ? <Image className="w-3.5 h-3.5 text-[#C2D64A]" /> : <File className="w-3.5 h-3.5 text-[var(--text-faint)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)] truncate">{att.file_name}</p>
                  <p className="text-[10px] text-[var(--text-faint)]">{sizeStr}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={async () => {
                      const url = await getAttachmentUrl(att.storage_path)
                      if (url) window.open(url, '_blank')
                    }}
                    className="p-1 text-[var(--text-faint)] hover:text-[#A8BA32] transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {att.user_id === userId && (
                    <button
                      type="button"
                      onClick={() => deleteAttachment(att.id, cardId, att.storage_path)}
                      className="p-1 text-[var(--text-faint)] hover:text-[#7A5C44] transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
