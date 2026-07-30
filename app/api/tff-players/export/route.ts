import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
const positionOrder:Record<string, number> = { GK:1, DEF:2, MID:3, FWD:4 };

export async function GET() {
  try {
    const { data:players, error } = await supabaseAdmin()
      .from('tff_players')
      .select('display_name,team_name,position,current_price,raw')
      .eq('season', '2025/26')
      .order('display_name');
    if (error) throw error;

    const rows = [...(players || [])]
      .sort((a:any, b:any) => (positionOrder[a.position] || 9) - (positionOrder[b.position] || 9) || a.display_name.localeCompare(b.display_name))
      .map((player:any) => [player.display_name, player.position, player.team_name, Number(player.current_price || 0) / 1000000, Number(player.raw?.total_points || 0)]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'B&G Fantasy Football';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('2025-26 Scores', { views:[{ state:'frozen', ySplit:1, showGridLines:false }] });
    sheet.addRow(['Player', 'Position', 'Team', 'Price (£m)', '2025/26 Score']);
    sheet.addRows(rows);
    sheet.getRow(1).height = 24;
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold:true, color:{ argb:'FFFFFFFF' } };
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF0C3A2B' } };
      cell.alignment = { vertical:'middle' };
    });
    for (let index = 2; index <= rows.length + 1; index += 1) {
      if (index % 2 === 1) sheet.getRow(index).eachCell(cell => { cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF2F6EE' } }; });
    }
    sheet.getColumn(1).width = 24;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 22;
    sheet.getColumn(4).width = 13;
    sheet.getColumn(5).width = 17;
    sheet.getColumn(4).numFmt = '0.0';
    sheet.getColumn(5).numFmt = '0';
    sheet.autoFilter = { from:'A1', to:'E1' };

    const file = await workbook.xlsx.writeBuffer();
    return new NextResponse(file, { headers:{
      'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':'attachment; filename="2025-26-BGFF-Player-Scores.xlsx"',
      'Cache-Control':'no-store',
    } });
  } catch (error) {
    return NextResponse.json({ error:error instanceof Error ? error.message : 'Unable to export 2025/26 player scores.' }, { status:500 });
  }
}