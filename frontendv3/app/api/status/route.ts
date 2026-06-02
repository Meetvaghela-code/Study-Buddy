import { NextResponse } from 'next/server'
import { getServiceStatuses } from '@/lib/a2a'

export async function GET() {
  try {
    const services = await getServiceStatuses()
    return NextResponse.json(services)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch service status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}