import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const n = (raw: Record<string, unknown>, key: string) => Number(raw[key] || 0);
const seasonFileName = (season?: string | null) => `${(season || '2025/26').replace('/', '-')}-BGFF-Players-List.xlsx`;
const positionOrder: Record<string, number> = { GK:1, DEF:2, MID:3, FWD:4 };
const clubAbbreviations: Record<string, string> = {
  'Arsenal':'ARS', 'Aston Villa':'AVL', 'Bournemouth':'BOU', 'Brentford':'BRE', 'Brighton':'BHA', 'Burnley':'BUR', 'Chelsea':'CHE',
  'Crystal Palace':'CRY', 'Everton':'EVE', 'Fulham':'FUL', 'Ipswich':'IPS', 'Leeds':'LEE', 'Leicester':'LEI', 'Liverpool':'LIV',
  'Luton':'LUT', 'Man City':'MCI', 'Man Utd':'MUN', 'Newcastle':'NEW', "Nott'm Forest":'NFO', 'Nottingham Forest':'NFO',
  'Sheffield Utd':'SHU', 'Southampton':'SOU', 'Spurs':'TOT', 'Sunderland':'SUN', 'West Brom':'WBA', 'West Ham':'WHU', 'Wolves':'WOL',
};
const clubCode = (club:string) => clubAbbreviations[club] || club.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();

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
    const headers = ['Player', 'Club', 'Position', 'Owner', 'Points (excl. bonus)', 'FPL price (£m)'];
    const sortedPlayers = [...(players || [])].sort((a:any, b:any) => a.team_name.localeCompare(b.team_name) || (positionOrder[a.position] || 9) - (positionOrder[b.position] || 9) || a.web_name.localeCompare(b.web_name));
    const rows = sortedPlayers.map((player:any) => {
      const raw = player.raw || {};
      return [
        player.web_name, clubCode(player.team_name || ''), player.position, ownerById.get(player.fpl_id) || '', n(raw, 'total_points') - n(raw, 'bonus'), player.current_price / 10,
      ];
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'B&G Fantasy Football';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Players', { views:[{ state:'frozen', ySplit:1, showGridLines:false }] });
    sheet.addRow(headers);
    sheet.addRows(rows);
    sheet.autoFilter = { from:'A1', to:`F${rows.length + 1}` };
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold:true, color:{ argb:'FFFFFFFF' } };
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF0C3A2B' } };
      cell.alignment = { vertical:'middle' };
    });
    for (let index = 2; index <= rows.length + 1; index += 1) {
      if (index % 2 === 1) sheet.getRow(index).eachCell(cell => { cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF2F6EE' } }; });
    }
    sheet.getColumn(1).width = 22;
    sheet.getColumn(2).width = 10;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 22;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 14;
    sheet.getColumn(6).numFmt = '0.0';

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
