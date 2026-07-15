import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
const escape = (value: unknown) => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const n = (raw: Record<string, unknown>, key: string) => Number(raw[key] || 0);
export async function GET() {
  try {
    const db = supabaseAdmin();
    const [{ data: players, error }, { data: ownership }] = await Promise.all([
      db.from('fpl_players').select('fpl_id,web_name,first_name,second_name,team_name,position,current_price,raw').order('team_name').order('web_name'),
      db.from('squad_players').select('fpl_id,squads(name)').is('released_at', null),
    ]);
    if (error) throw error;
    const ownerById = new Map((ownership || []).map((row: any) => [row.fpl_id, row.squads?.name || '']));
    const headers = ['Full name','Short name','Club','Position','Price (£m)','Owner','Points (excl. bonus)','Games started','Clean sheets','Defensive contribution','Assists','Goals scored','Penalty missed','Penalty saved','Yellow cards','Red cards'];
    const rows = (players || []).map((player: any) => { const raw = player.raw || {}; return [`${player.first_name || ''} ${player.second_name || ''}`.trim(),player.web_name,player.team_name,player.position,(player.current_price/10).toFixed(1),ownerById.get(player.fpl_id)||'',n(raw,'total_points')-n(raw,'bonus'),n(raw,'starts'),n(raw,'clean_sheets'),n(raw,'defensive_contribution'),n(raw,'assists'),n(raw,'goals_scored'),n(raw,'penalties_missed'),n(raw,'penalties_saved'),n(raw,'yellow_cards'),n(raw,'red_cards')]; });
    const xmlRows = [headers,...rows].map((row, index)=>`<Row>${row.map(value=>`<Cell><Data ss:Type="${typeof value==='number'?'Number':'String'}">${escape(value)}</Data></Cell>`).join('')}</Row>`).join('');
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="FPL Players"><Table>${xmlRows}</Table></Worksheet></Workbook>`;
    return new NextResponse(xml,{headers:{'Content-Type':'application/vnd.ms-excel; charset=utf-8','Content-Disposition':'attachment; filename="bails-and-goldies-players.xls"','Cache-Control':'no-store'}});
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to export players.' }, { status: 500 }); }
}
