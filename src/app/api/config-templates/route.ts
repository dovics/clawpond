import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-middleware'
import { presetTemplates } from '@/lib/config/templates'

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    return NextResponse.json({
      templates: presetTemplates
    })
  } catch (error) {
    console.error('Error loading templates:', error)
    return NextResponse.json(
      { error: 'Failed to load templates' },
      { status: 500 }
    )
  }
}
