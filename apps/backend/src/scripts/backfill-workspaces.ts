// apps/backend/src/scripts/backfill-workspaces.ts
import 'dotenv/config';
import { prisma } from '../services/db.js';

async function main() {
  console.log('[backfill] iniciando backfill de workspaces personales por owner…');

  // 1) owners con bases sin workspace asignado
  const owners = await prisma.base.findMany({
    where: { workspaceId: null },
    select: { ownerId: true },
    distinct: ['ownerId'],
  });

  if (owners.length === 0) {
    console.log('[backfill] no hay bases pendientes por asignar workspaceId');
    return;
  }

  for (const { ownerId } of owners) {
    // 2) busca (o crea) workspace "Personal" del owner
    let ws = await prisma.workspace.findFirst({
      where: { ownerId, name: 'Personal', isTrashed: false },
      select: { id: true },
    });
    if (!ws) {
      ws = await prisma.workspace.create({
        data: { ownerId, name: 'Personal' },
        select: { id: true },
      });
      console.log(`[backfill] creado Workspace#${ws.id} ("Personal") para owner ${ownerId}`);
    }

    // 3) asigna ese workspace a todas las bases del owner que no tengan workspace
    const result = await prisma.base.updateMany({
      where: { ownerId, workspaceId: null },
      data: { workspaceId: ws.id },
    });
    console.log(`[backfill] owner ${ownerId}: ${result.count} base(s) actualizadas con workspaceId=${ws.id}`);
  }

  console.log('[backfill] COMPLETADO.');
}

main()
  .catch((e) => {
    console.error('[backfill] error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });