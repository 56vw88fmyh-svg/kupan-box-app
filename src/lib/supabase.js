import { createClient } from '@supabase/supabase-js'
import { activeGymId } from '../config/gymConfig.js'

const env = import.meta.env ?? {}
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY
const supabaseGymId = String(env.VITE_SUPABASE_GYM_ID ?? '').trim().toLowerCase()

export function isSupabaseBindingCompatible(gymId, bindingId = '') {
  const normalizedBinding = String(bindingId).trim().toLowerCase()
  return gymId === 'kupan' ? !normalizedBinding || normalizedBinding === 'kupan' : normalizedBinding === gymId
}

const isSupabaseBoundToActiveGym = isSupabaseBindingCompatible(activeGymId, supabaseGymId)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && isSupabaseBoundToActiveGym)
export const supabaseConfigurationError = supabaseUrl && supabaseAnonKey && !isSupabaseBoundToActiveGym
  ? `Supabase no esta vinculado a la instalacion ${activeGymId}. Define VITE_SUPABASE_GYM_ID=${activeGymId}.`
  : ''

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
