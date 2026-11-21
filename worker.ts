// Worker de Cloudflare: sirve la app (lo genera OpenNext en .open-next/worker.js) y
// añade la tarea programada que en Vercel hacía vercel.json → crons.
// @ts-ignore `.open-next/worker.js` se genera al compilar
import { default as handler } from './.open-next/worker.js';

// Cada minuto (wrangler.jsonc → triggers.crons) se llaman estas rutas internas.
const CRON_PATHS = [
  '/api/spotify-poll', // "ahora suena" de Spotify
  '/api/push-cron',    // notificaciones push (recordatorios y avisos sociales)
];

export default {
  fetch: handler.fetch,

  async scheduled(_event: unknown, env: Record<string, string | undefined>, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const headers: Record<string, string> = {};
    if (env.CRON_SECRET) headers.authorization = `Bearer ${env.CRON_SECRET}`;
    // El resultado queda en los logs del Worker (Observability) para poder revisarlo.
    for (const path of CRON_PATHS) {
      const req = new Request(`https://gymrace.internal${path}`, { headers });
      ctx.waitUntil(
        handler.fetch(req, env, ctx)
          .then(async (res: Response) => {
            console.log(`[cron ${path}] ${res.status} ${(await res.text()).slice(0, 200)}`);
          })
          .catch((e: unknown) => console.log(`[cron ${path}] error ${String(e)}`)),
      );
    }
  },
};

// @ts-ignore se genera al compilar
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
