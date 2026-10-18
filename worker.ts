// Worker de Cloudflare: sirve la app (lo genera OpenNext en .open-next/worker.js) y
// añade la tarea programada que en Vercel hacía vercel.json → crons.
// @ts-ignore `.open-next/worker.js` se genera al compilar
import { default as handler } from './.open-next/worker.js';

export default {
  fetch: handler.fetch,

  // Cada minuto (wrangler.jsonc → triggers.crons): sondea Spotify igual que Vercel Cron.
  async scheduled(_event: unknown, env: Record<string, string | undefined>, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const headers: Record<string, string> = {};
    if (env.CRON_SECRET) headers.authorization = `Bearer ${env.CRON_SECRET}`;
    const req = new Request('https://gymrace.internal/api/spotify-poll', { headers });
    // El resultado queda en los logs del Worker (Observability) para poder revisarlo.
    ctx.waitUntil(
      handler.fetch(req, env, ctx).then(async (res: Response) => {
        console.log(`[cron spotify-poll] ${res.status} ${(await res.text()).slice(0, 200)}`);
      }),
    );
  },
};

// @ts-ignore se genera al compilar
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';
