import { supabase } from '../../lib/supabase.js'
import { logAppError } from '../../utils/appState.js'
import { buildCreateStudentBody } from '../../utils/adminMutationBuilders.js'
import { createMutationResult, useAdminMutationState } from './useAdminMutationState.js'

export function useAdminStudents({ supabaseClient = supabase, logError = logAppError } = {}) {
  const { operationState, runOperation } = useAdminMutationState({ createStudent: false })

  async function createStudent(studentDraft) {
    return runOperation('createStudent', async () => {
      const { data, error } = await supabaseClient.functions.invoke('create-student', {
        body: buildCreateStudentBody(studentDraft),
      })

      if (error || !data?.ok) {
        const normalizedError = error ?? new Error(data?.message || 'No pudimos crear el alumno. Revisa la Edge Function y tu sesion admin.')
        logError('admin.students.create', normalizedError, { email: studentDraft.email })
        return createMutationResult({ success: false, error: normalizedError, data, message: data?.message || '' })
      }

      return createMutationResult({ success: true, data, affectedSections: ['profiles', 'memberships'] })
    })
  }

  return {
    createStudent,
    isCreatingStudent: Boolean(operationState.createStudent),
  }
}
