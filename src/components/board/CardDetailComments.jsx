import { Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import MentionInput from './MentionInput'

function parseMentions(text, boardMembers) {
  const mentions = []
  const re = /@(\w[\w ]*?)(?=\s@|\s[^@]|$)/g
  let m
  while ((m = re.exec(text)) !== null) {
    const name = m[1].trim()
    const member = boardMembers.find(
      (mb) => mb.display_name.toLowerCase() === name.toLowerCase()
    )
    if (member) mentions.push(member)
  }
  return mentions
}

export default function CardDetailComments({
  comments, commentText, setCommentText, addComment, deleteComment,
  cardId, card, boardMembers, notify, profile, userId,
}) {
  const handleSubmit = () => {
    if (!commentText.trim()) return
    addComment(cardId, commentText.trim())

    const mentioned = parseMentions(commentText, boardMembers)
    for (const member of mentioned) {
      notify({
        userId: member.user_id,
        type: 'mention',
        title: 'mentioned you in a comment',
        body: commentText.trim().slice(0, 100),
        cardId,
        boardId: card?.board_id,
        actorName: profile?.display_name || 'Someone',
      })
    }
    setCommentText('')
  }

  return (
    <div className="px-5 pt-4 pb-4 border-t border-[#E8E2DB]">
      <label className="text-xs font-medium text-[#8E8E89] uppercase tracking-wider mb-3 block">
        Comments
      </label>
      <div className="space-y-3 mb-3">
        {(comments || []).map((comment) => (
          <div key={comment.id} className="group">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-[#5C5C57]">{comment.author_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8E8E89]">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.user_id === userId && (
                  <button
                    type="button"
                    onClick={() => deleteComment(comment.id, cardId)}
                    className="opacity-0 group-hover:opacity-100 text-[#8E8E89] hover:text-[#7A5C44] transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-[#5C5C57] mt-0.5">
              {comment.text.split(/(@\w[\w ]*)/g).map((part, i) =>
                part.startsWith('@') ? (
                  <span key={i} className="font-medium text-[#A8BA32]">{part}</span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <MentionInput
          value={commentText}
          onChange={setCommentText}
          members={boardMembers}
          placeholder="Add a comment... (@ to mention)"
          onSubmit={handleSubmit}
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="px-3 py-1.5 text-xs font-medium bg-[#1B1B18] text-white rounded-lg hover:bg-[#333] transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
