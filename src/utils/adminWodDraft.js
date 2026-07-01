export const WOD_DRAFT_STORAGE_KEY = 'kupan_admin_wod_draft_v1'
export const WOD_DRAFT_VERSION = 1
export const WOD_DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

const WOD_CONTENT_FIELDS = ['title', 'warmup', 'strength', 'workout', 'time_cap', 'notes']
const WOD_COMPARISON_FIELDS = ['date', ...WOD_CONTENT_FIELDS]

export function hasMeaningfulWodDraftContent(draft) {
  if (!draft || typeof draft !== 'object') return false

  return WOD_CONTENT_FIELDS.some((field) => String(draft[field] ?? '').trim().length > 0)
}

export function cloneSerializableWodDraft(draft) {
  const serialized = JSON.stringify(draft)
  return JSON.parse(serialized)
}

export function createWodDraftRecord(draft, remoteWod = null, now = () => new Date()) {
  const serializableDraft = cloneSerializableWodDraft(draft)

  return {
    version: WOD_DRAFT_VERSION,
    savedAt: now().toISOString(),
    date: serializableDraft.date ?? '',
    draft: serializableDraft,
    remoteReference: remoteWod ? {
      id: remoteWod.id ?? null,
      date: remoteWod.date ?? null,
      updated_at: remoteWod.updated_at ?? null,
      created_at: remoteWod.created_at ?? null,
    } : null,
  }
}

export function parseStoredWodDraft(value) {
  if (!value) return null

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!parsed || parsed.version !== WOD_DRAFT_VERSION || !parsed.draft) return null
    if (!hasMeaningfulWodDraftContent(parsed.draft)) return null

    return {
      version: parsed.version,
      savedAt: parsed.savedAt ?? '',
      date: parsed.date ?? parsed.draft.date ?? '',
      draft: cloneSerializableWodDraft(parsed.draft),
      remoteReference: parsed.remoteReference ?? null,
    }
  } catch {
    return null
  }
}

export function isStoredWodDraftExpired(storedDraft, now = () => new Date()) {
  if (!storedDraft?.savedAt) return true
  const savedAtMs = new Date(storedDraft.savedAt).getTime()
  if (Number.isNaN(savedAtMs)) return true
  return now().getTime() - savedAtMs > WOD_DRAFT_MAX_AGE_MS
}

export function areWodDraftsEqual(leftDraft, rightDraft) {
  if (!leftDraft || !rightDraft) return false

  return WOD_COMPARISON_FIELDS.every((field) => String(leftDraft[field] ?? '') === String(rightDraft[field] ?? ''))
}

export function classifyStoredWodDraft(storedDraft, remoteWod = null, now = () => new Date()) {
  if (!storedDraft) return 'empty'
  if (!hasMeaningfulWodDraftContent(storedDraft.draft)) return 'empty'
  if (isStoredWodDraftExpired(storedDraft, now)) return 'expired'
  if (!remoteWod) return 'recoverable'
  if (storedDraft.date && remoteWod.date && storedDraft.date !== remoteWod.date) return 'incompatible'
  if (areWodDraftsEqual(storedDraft.draft, remoteWod)) return 'identical_to_remote'

  const savedAtMs = new Date(storedDraft.savedAt).getTime()
  const remoteUpdatedAtMs = new Date(remoteWod.updated_at ?? remoteWod.created_at ?? '').getTime()
  if (Number.isNaN(savedAtMs) || Number.isNaN(remoteUpdatedAtMs)) return 'recoverable'
  return savedAtMs >= remoteUpdatedAtMs ? 'potentially_newer' : 'potentially_old'
}

export function getWodDraftMetadata(storedDraft) {
  if (!storedDraft) return null

  return {
    version: storedDraft.version,
    savedAt: storedDraft.savedAt,
    date: storedDraft.date,
    remoteReference: storedDraft.remoteReference,
  }
}

export function serializeWodDraft(draft) {
  return JSON.stringify(cloneSerializableWodDraft(draft))
}
