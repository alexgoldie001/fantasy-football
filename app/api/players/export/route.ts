import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const n = (raw: Record<string, unknown>, key: string) => Number(raw[key] || 0);
const seasonFileName = (season?: string | null) => `${(season || '2025/26').replace('/', '-')}-BGFF-Players-List.xlsx`;

export async function GET() {
  try {
    const db = supabaseAdmin();
    const [{ data:players, error }, { data:ownership }, { data:league }] = await Promise.all([
      db.from('fpl_players').select('fpl_id,web_name,first_name,second_name,team_name,position,current_price,raw').order('team_name').order('web_name'),
      db.from('squad_players').select('fpl_id,squads(name)').is('released_at', null),
      db.from('leagues').select('season').limit(1).maybeSingle(),
    ]);
    if (error) throw error;

    const ownerById = new Map((ownership || []).map((row:any) => [row.fpl_id, row.squads?.name || '']));
    const headers = ['Full name', 'Short name', 'Club', 'Position', 'Price (£m)', 'Owner', 'Points (excl. bonus)', 'Games started', 'Clean sheets', 'Defensive contribution', 'Assists', 'Goals scored', 'Penalty missed', 'Penalty saved', 'Yellow cards', 'Red cards'];
    const rows = (players || []).map((player:any) => {
      const raw = player.raw || {};
      return [
        `${player.first_name || ''} ${player.second_name || ''}`.trim(), player.web_name, player.team_name, player.position, player.current_price / 10,
        ownerById.get(player.fpl_id) || '', n(raw, 'total_points') - n(raw, 'bonus'), n(raw, 'starts'), n(raw, 'clean_sheets'),
        n(raw, 'defensive_contribution'), n(raw, 'assists'), n(raw, 'goals_scored'), n(raw, 'penalties_missed'), n(raw, 'penalties_saved'), n(raw, 'yellow_cards'), n(raw, 'red_cards'),
      ];
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'B&G Fantasy Football';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Players', { views:[{ state:'frozen', ySplit:1, showGridLines:false }] });
    sheet.addRow(headers);
    sheet.addRows(rows);
    sheet.autoFilter = { from:'A1', to:`P${rows.length + 1}` };
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold:true, color:{ argb:'FFFFFFFF' } };
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF0C3A2B' } };
      cell.alignment = { vertical:'middle' };
    });
    for (let index = 2; index <= rows.length + 1; index += 1) {
      if (index % 2 === 1) sheet.getRow(index).eachCell(cell => { cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF2F6EE' } }; });
    }
    sheet.getColumn(1).width = 24;
    sheet.getColumn(2).width = 18;
    sheet.getColumn(3).width = 18;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 12;
    sheet.getColumn(6).width = 22;
    for (let column = 7; column <= 16; column += 1) sheet.getColumn(column).width = 18;
    sheet.getColumn(5).numFmt = '0.0';

    const file = await workbook.xlsx.writeBuffer();
    return new NextResponse(file, { headers:{
      'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':`attachment; filename="${seasonFileName(league?.season)}"`,
      'Cache-Control':'no-store',
    } });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to export players.' }, { status:500 });
  }
}
