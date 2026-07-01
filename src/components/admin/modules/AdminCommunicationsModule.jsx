import { AdminCommunityPostForm } from '../forms/AdminCommunityPostForm.jsx'
import { AdminSection, SmallRow } from '../AdminUi.jsx'

export function AdminCommunicationsModule({ draft, posts, onDraftChange, onSave, onEdit, onToggle, isSaving = false }) {
  return (
    <AdminSection eyebrow="Comunidad" title="Eventos y noticias">
      <AdminCommunityPostForm draft={draft} onDraftChange={onDraftChange} onSubmit={onSave} isSubmitting={isSaving} />
      {posts.map((post) => (
        <SmallRow
          key={post.id}
          title={post.title}
          meta={`${post.type ?? 'post'} · ${post.active ? 'Activo' : 'Inactivo'}`}
          detail={post.content}
          action={(
            <div className="grid shrink-0 gap-2">
              <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onEdit(post)}>Editar</button>
              <button type="button" className="k-button-secondary px-3 py-2 text-xs" onClick={() => onToggle(post)}>{post.active ? 'Ocultar' : 'Activar'}</button>
            </div>
          )}
        />
      ))}
    </AdminSection>
  )
}
