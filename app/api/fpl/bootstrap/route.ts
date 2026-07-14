import { NextResponse } from 'next/server';
export const revalidate = 900;
const FPL_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';

// Requests originate from Vercel's server, so the FPL browser CORS policy never applies.
export async function GET() {
  try {
    const response = await fetch(FPL_URL, { next: { revalidate: 900 }, headers: { 'User-Agent': 'TheDraftLeague/1.0' } });
    if (!response.ok) throw new Error(`FPL responded ${response.status}`);
    const data = await response.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=3600' } });
  } catch { return NextResponse.json({ error: 'FPL data is temporarily unavailable.' }, { status: 503 }); }
}
