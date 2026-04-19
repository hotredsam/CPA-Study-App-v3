import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// TODO: Implement real question history per topic once Question→Topic relation is queryable
// This stub returns an empty array so the TopicDetail UI renders gracefully.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json([])
}
