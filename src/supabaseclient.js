import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zbjcyewbscyecwqaabud.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiamN5ZXdic2N5ZWN3cWFhYnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODkwMzUsImV4cCI6MjA5MjU2NTAzNX0.QN141aOYYIHH6jI36_tJGP3HYKy9msMmAo-IDDu0J9g'

export const supabase = createClient(supabaseUrl, supabaseKey)