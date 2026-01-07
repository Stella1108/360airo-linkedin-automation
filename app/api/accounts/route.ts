import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: accounts, error } = await supabase
      .from('linkedin_accounts_new')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}