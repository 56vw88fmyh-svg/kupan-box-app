import { supabase } from '../../lib/supabase.js'
import { logAppError } from '../../utils/appState.js'
import { buildCommunityPostPayload } from '../../utils/adminMutationBuilders.js'
import { createMutationResult, useAdminMutationState } from './useAdminMutationState.js'

export function useAdminCommunications({ supabaseClient = supabase, logError = logAppError } = {}) {
  const { operationState, runOperation, isPending } = useAdminMutationState({ savePost: false })

  async function savePost(postDraft) {
    return runOperation('savePost', async () => {
      const payload = buildCommunityPostPayload(postDraft)
      const mutation = postDraft.id
        ? supabaseClient.from('community_posts').update(payload).eq('id', postDraft.id)
        : supabaseClient.from('community_posts').insert(payload)
      const { data, error } = await mutation

      if (error) {
        logError('admin.communications.save_post', error, { postId: postDraft.id || null })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['posts'] })
    })
  }

  async function togglePost(post) {
    const operationKey = `togglePost:${post.id}`
    return runOperation(operationKey, async () => {
      const { data, error } = await supabaseClient.from('community_posts').update({ active: !post.active }).eq('id', post.id)

      if (error) {
        logError('admin.communications.toggle_post', error, { postId: post.id })
        return createMutationResult({ success: false, error })
      }

      return createMutationResult({ success: true, data, affectedSections: ['posts'] })
    })
  }

  return {
    savePost,
    togglePost,
    isSavingPost: Boolean(operationState.savePost),
    isPostPending: isPending,
  }
}
