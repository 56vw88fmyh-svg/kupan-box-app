import assert from 'node:assert/strict'
import {
  WOD_DRAFT_MAX_AGE_MS,
  WOD_DRAFT_STORAGE_KEY,
  WOD_DRAFT_VERSION,
  areWodDraftsEqual,
  classifyStoredWodDraft,
  createWodDraftRecord,
  hasMeaningfulWodDraftContent,
  isStoredWodDraftExpired,
  parseStoredWodDraft,
  serializeWodDraft,
} from './adminWodDraft.js'

const emptyDraft = {
  date: '2026-07-01',
  title: '',
  warmup: '',
  strength: '',
  workout: '',
  time_cap: '',
  notes: '',
}

assert.equal(WOD_DRAFT_STORAGE_KEY, 'kupan_admin_wod_draft_v1')
assert.equal(WOD_DRAFT_VERSION, 1)
assert.equal(WOD_DRAFT_MAX_AGE_MS, 14 * 24 * 60 * 60 * 1000)
assert.equal(hasMeaningfulWodDraftContent(emptyDraft), false)
assert.equal(hasMeaningfulWodDraftContent({ ...emptyDraft, warmup: 'Movilidad + técnica' }), true)
assert.equal(hasMeaningfulWodDraftContent({ ...emptyDraft, workout: 'AMRAP 12' }), true)
assert.equal(hasMeaningfulWodDraftContent({ ...emptyDraft, title: '   ' }), false)
assert.equal(hasMeaningfulWodDraftContent({ ...emptyDraft, notes: 'Escalar cargas' }), true)

const record = createWodDraftRecord(
  { ...emptyDraft, workout: 'AMRAP 12' },
  { id: 'remote-1', date: '2026-07-01', updated_at: '2026-06-30T20:00:00.000Z' },
  () => new Date('2026-06-30T21:00:00.000Z'),
)

assert.equal(record.version, 1)
assert.equal(record.savedAt, '2026-06-30T21:00:00.000Z')
assert.equal(record.date, '2026-07-01')
assert.equal(record.draft.workout, 'AMRAP 12')
assert.equal(record.remoteReference.id, 'remote-1')

assert.deepEqual(parseStoredWodDraft(JSON.stringify(record)), record)
assert.equal(parseStoredWodDraft(JSON.stringify({ ...record, version: 99 })), null)
assert.equal(parseStoredWodDraft(JSON.stringify({ ...record, draft: emptyDraft })), null)
assert.equal(parseStoredWodDraft('not-json'), null)
assert.equal(isStoredWodDraftExpired(record, () => new Date('2026-07-14T20:59:59.000Z')), false)
assert.equal(isStoredWodDraftExpired(record, () => new Date('2026-07-15T21:00:01.000Z')), true)
assert.equal(isStoredWodDraftExpired({ ...record, savedAt: '' }), true)
assert.equal(areWodDraftsEqual(record.draft, { ...record.draft }), true)
assert.equal(areWodDraftsEqual(record.draft, { ...record.draft, workout: 'For time' }), false)
assert.equal(classifyStoredWodDraft(record, null, () => new Date('2026-07-01T12:00:00.000Z')), 'recoverable')
assert.equal(classifyStoredWodDraft(record, { ...record.draft }, () => new Date('2026-07-01T12:00:00.000Z')), 'identical_to_remote')
assert.equal(classifyStoredWodDraft(record, { ...record.draft, date: '2026-07-02' }, () => new Date('2026-07-01T12:00:00.000Z')), 'incompatible')
assert.equal(
  classifyStoredWodDraft(record, { ...record.draft, workout: 'For time', updated_at: '2026-06-30T20:30:00.000Z' }, () => new Date('2026-07-01T12:00:00.000Z')),
  'potentially_newer',
)
assert.equal(
  classifyStoredWodDraft(record, { ...record.draft, workout: 'For time', updated_at: '2026-07-01T20:30:00.000Z' }, () => new Date('2026-07-01T12:00:00.000Z')),
  'potentially_old',
)
assert.equal(classifyStoredWodDraft(record, null, () => new Date('2026-07-20T12:00:00.000Z')), 'expired')

assert.equal(
  serializeWodDraft({ ...emptyDraft, workout: 'AMRAP 12' }),
  JSON.stringify({ ...emptyDraft, workout: 'AMRAP 12' }),
)
