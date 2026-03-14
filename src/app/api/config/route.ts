import { NextResponse } from 'next/server';
import { getZeroClawImage } from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    zeroclaw_image: getZeroClawImage(),
  });
}
