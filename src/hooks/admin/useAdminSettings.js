import { saveAppSetting } from '../../utils/sharedContent.js'
import { logAppError } from '../../utils/appState.js'
import { createMutationResult, useAdminMutationState } from './useAdminMutationState.js'

export function useAdminSettings({ saveSetting = saveAppSetting, logError = logAppError } = {}) {
  const { operationState, runOperation } = useAdminMutationState({ saveTexts: false })

  async function saveTexts(textDraft, settingKeys) {
    return runOperation('saveTexts', async () => {
      const entries = Object.entries(settingKeys)
      const results = await Promise.all(entries.map(async ([field, key]) => {
        try {
          const result = await saveSetting(key, textDraft[field])
          return { field, key, result }
        } catch (error) {
          logError('admin.settings.save_text', error, { key })
          return { field, key, result: { ok: false, message: 'No pudimos guardar el texto.' }, error }
        }
      }))
      const failed = results.filter((item) => !item.result.ok)

      if (failed.length > 0) {
        failed.forEach((item) => {
          if (item.error) return
          logError('admin.settings.save_text', new Error(item.result.message), { key: item.key })
        })
        return createMutationResult({
          success: false,
          partial: failed.length < results.length,
          error: failed[0].error ?? new Error(failed[0].result.message),
          message: failed[0].result.message,
          affectedSections: failed.length < results.length ? ['settings'] : [],
          extra: {
            savedKeys: results.filter((item) => item.result.ok).map((item) => item.key),
            failedKeys: failed.map((item) => item.key),
          },
        })
      }

      return createMutationResult({
        success: true,
        affectedSections: ['settings'],
        extra: { savedKeys: results.map((item) => item.key), failedKeys: [] },
      })
    })
  }

  return {
    saveTexts,
    isSavingSettings: Boolean(operationState.saveTexts),
  }
}
