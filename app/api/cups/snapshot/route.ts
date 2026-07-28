import { NextResponse } from 'next/server';
import { scoreBoard } from '@/lib/scoreboard';

// Uses exactly the same monthly calculations as the League tab. The five
// completed months before the 1 January cup cut-off form the seeding table.
const seedingMonths=['2025-08','2025-09','2025-10','2025-11','2025-12'];
export async function GET(){try{const periods=await Promise.all(seedingMonths.map(key=>scoreBoard('month',key)));const totals=new Map<string,{id:string;team:string;manager:string;points:number}>();for(const period of periods)for(const row of period.rows){const current=totals.get(row.id)||{id:row.id,team:row.team,manager:row.manager,points:0};current.points+=row.points;totals.set(row.id,current);}const rows=[...totals.values()].sort((a,b)=>b.points-a.points||a.team.localeCompare(b.team)).map((row,index)=>({...row,rank:index+1}));return NextResponse.json({rows});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load January snapshot.'},{status:500});}}
