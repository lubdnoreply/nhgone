import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// สร้าง Client แบบที่รองรับกรณีตัวแปรหายไปตอน Build
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
