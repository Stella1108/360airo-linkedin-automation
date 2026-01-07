// app/api/workflow/status/[runId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ✅ FIXED: await the params Promise
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> } // params is now a Promise
) {
  try {
    // ✅ AWAIT the params first
    const { runId } = await params
    
    const { data, error } = await supabaseAdmin
      .from('workflow_executions')
      .select('*')
      .eq('id', runId) // Use the awaited runId
      .single()
    
    if (error || !data) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error fetching execution status:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}