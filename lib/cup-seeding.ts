import { scoreBoard } from '@/lib/scoreboard';

const months=['2025-08','2025-09','2025-10','2025-11','2025-12'];
export async function cupSeedingRows(){const periods=await Promise.all(months.map(key=>scoreBoard('month',key)));const totals=new Map<string,{id:string;team:string;manager:string;points:number}>();for(const period of periods)for(const row of period.rows){const current=totals.get(row.id)||{id:row.id,team:row.team,manager:row.manager,points:0};current.points+=row.points;totals.set(row.id,current);}return [...totals.values()].sort((a,b)=>b.points-a.points||a.team.localeCompare(b.team)).map((row,index)=>({...row,rank:index+1}));}
