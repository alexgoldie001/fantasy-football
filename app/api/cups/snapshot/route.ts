import { NextResponse } from 'next/server';
import { cupSeedingRows } from '@/lib/cup-seeding';

// Uses exactly the same monthly calculations as the League tab. The five
// completed months before the 1 January cup cut-off form the seeding table.
export async function GET(){try{return NextResponse.json({rows:await cupSeedingRows()});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load January snapshot.'},{status:500});}}
