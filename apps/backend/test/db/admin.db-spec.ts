import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { startApp } from './setup.js';

type Started = Awaited<ReturnType<typeof startApp>>;
type Item = {
  id: string;
  publishStatus: string;
  visible: boolean;
  sortOrder: number;
  content: Record<string, unknown>;
  draft: Record<string, unknown> | null;
};

const project = (slug: string, title = 'Geode') => ({
  slug,
  title,
  summary: 'Data layer for live games',
  releaseStatus: 'RELEASED',
  body: [{ id: 'intro', type: 'richText', markdown: 'Hello' }],
});

describe('admin content (database)', () => {
  let app: INestApplication;
  let db: Started['db'];
  let admin: Started['admin'];
  let calls: { url: string; body: unknown }[];

  beforeEach(async () => {
    calls = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      calls.push({
        url: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      const github = String(input).startsWith('https://api.github.com');
      return Promise.resolve(
        new Response(github ? null : '{}', { status: github ? 204 : 200 }),
      );
    });
    ({ app, db, admin } = await startApp());
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  const refreshes = () =>
    calls.filter((c) => c.url === 'http://localhost:3000/api/revalidate');
  const deploys = () => calls.filter((c) => c.url.includes('/dispatches'));

  async function create(collection: string, content: object): Promise<Item> {
    const res = await admin('post', `/admin/collections/${collection}`)
      .send(content)
      .expect(201);
    return (res.body as { data: { item: Item } }).data.item;
  }

  it('creates items as drafts at the end of the list, without touching the site', async () => {
    const first = await create('stats', { value: '6', label: 'Years' });
    const second = await create('stats', { value: '2', label: 'Flagships' });

    expect(first).toMatchObject({
      publishStatus: 'DRAFT',
      visible: true,
      sortOrder: 0,
    });
    expect(second.sortOrder).toBe(1);
    expect(refreshes()).toHaveLength(0);
  });

  it('edits an unpublished item in place', async () => {
    const stat = await create('stats', { value: '6', label: 'Years' });
    const res = await admin('put', `/admin/collections/stats/${stat.id}`)
      .send({ value: '7', label: 'Years' })
      .expect(200);

    expect(res.body.data.item).toMatchObject({
      content: { value: '7' },
      draft: null,
    });
  });

  it('holds edits to a published item as a draft until it is published again', async () => {
    const stat = await create('stats', { value: '6', label: 'Years' });
    await admin('post', `/admin/collections/stats/${stat.id}/publish`).expect(
      200,
    );

    const saved = await admin('put', `/admin/collections/stats/${stat.id}`)
      .send({ value: '7', label: 'Years' })
      .expect(200);
    expect(saved.body.data.item).toMatchObject({
      publishStatus: 'PUBLISHED',
      content: { value: '6' },
      draft: { value: '7', label: 'Years' },
    });
    // the live row is untouched
    expect((await db.stat.findUnique({ where: { id: stat.id } }))?.value).toBe(
      '6',
    );

    const published = await admin(
      'post',
      `/admin/collections/stats/${stat.id}/publish`,
    ).expect(200);
    // cleared to a real NULL, not a JSON null that SQL counts as a value
    const [count] = await db.$queryRaw<{ drafts: number }[]>`
      SELECT count(*)::int AS drafts FROM "Stat" WHERE "draft" IS NOT NULL`;
    expect(count?.drafts).toBe(0);
    expect(published.body.data.item).toMatchObject({
      content: { value: '7' },
      draft: null,
    });
    expect(refreshes().at(-1)?.body).toEqual({ tags: ['site', 'projects'] });
  });

  it('discards a draft and keeps the live content', async () => {
    const stat = await create('stats', { value: '6', label: 'Years' });
    await admin('post', `/admin/collections/stats/${stat.id}/publish`).expect(
      200,
    );
    await admin('put', `/admin/collections/stats/${stat.id}`)
      .send({ value: '9', label: 'Years' })
      .expect(200);

    const res = await admin(
      'post',
      `/admin/collections/stats/${stat.id}/discard`,
    ).expect(200);
    expect(res.body.data.item).toMatchObject({
      content: { value: '6' },
      draft: null,
    });
  });

  it('previews drafts and unpublished items, the public site shows neither', async () => {
    await db.section.create({
      data: {
        slug: 'stats',
        type: 'stats',
        title: 'Numbers',
        publishStatus: 'PUBLISHED',
      },
    });
    const live = await create('stats', { value: '6', label: 'Years' });
    await admin('post', `/admin/collections/stats/${live.id}/publish`).expect(
      200,
    );
    await admin('put', `/admin/collections/stats/${live.id}`)
      .send({ value: '7', label: 'Years' })
      .expect(200);
    await create('stats', { value: '3', label: 'Unpublished' });

    const statsOf = (body: {
      data: { sections: { type: string; stats?: { value: string }[] }[] };
    }) =>
      body.data.sections
        .find((s) => s.type === 'stats')
        ?.stats?.map((s) => s.value);

    const preview = await admin('get', '/admin/preview/site').expect(200);
    const site = await request(app.getHttpServer())
      .get('/public/site')
      .expect(200);
    expect(statsOf(preview.body)).toEqual(['7', '3']);
    expect(statsOf(site.body)).toEqual(['6']);
  });

  it('hides, shows and reorders, refreshing the site each time', async () => {
    const a = await create('stats', { value: '1', label: 'A' });
    const b = await create('stats', { value: '2', label: 'B' });

    await admin('put', `/admin/collections/stats/${a.id}/visibility`)
      .send({ visible: false })
      .expect(200);
    const reordered = await admin('post', '/admin/collections/stats/reorder')
      .send({ ids: [b.id, a.id] })
      .expect(200);

    expect(reordered.body.data.map((i: Item) => i.content.label)).toEqual([
      'B',
      'A',
    ]);
    expect(reordered.body.data[1].visible).toBe(false);
    expect(refreshes()).toHaveLength(2);
    // a partial order is refused
    await admin('post', '/admin/collections/stats/reorder')
      .send({ ids: [a.id] })
      .expect(400);
  });

  it('only accepts whitelisted fields', async () => {
    const stat = await create('stats', { value: '6', label: 'Years' });

    for (const extra of [
      { publishStatus: 'PUBLISHED' },
      { id: stat.id },
      { draft: null },
    ]) {
      await admin('put', `/admin/collections/stats/${stat.id}`)
        .send({ value: '6', label: 'Years', ...extra })
        .expect(400);
    }
    await admin('post', '/admin/collections/users').send({}).expect(400);
    await admin('post', '/admin/collections/stats')
      .send({ value: '', label: 'x' })
      .expect(400);
  });

  it('deploys when the published project URLs change, and only then', async () => {
    const geode = await create('projects', project('geode'));
    await admin('post', `/admin/collections/projects/${geode.id}/publish`)
      .expect(200)
      .expect((res) => expect(res.body.data.deploy).toBe('started'));
    expect(deploys()).toHaveLength(1);
    expect(deploys()[0]?.body).toEqual({ ref: 'main' });

    // a text edit, published: same URLs, no deploy
    await admin('put', `/admin/collections/projects/${geode.id}`)
      .send(project('geode', 'Geode 2'))
      .expect(200);
    await admin(
      'post',
      `/admin/collections/projects/${geode.id}/publish`,
    ).expect(200);
    expect(deploys()).toHaveLength(1);

    // a rename, published: deploy
    await admin('put', `/admin/collections/projects/${geode.id}`)
      .send(project('geode-data'))
      .expect(200);
    await admin(
      'post',
      `/admin/collections/projects/${geode.id}/publish`,
    ).expect(200);
    // hiding it: deploy
    await admin('put', `/admin/collections/projects/${geode.id}/visibility`)
      .send({ visible: false })
      .expect(200);
    expect(deploys()).toHaveLength(3);
  });

  it('refuses a slug another project already has', async () => {
    await create('projects', project('geode'));
    const res = await admin('post', '/admin/collections/projects')
      .send(project('geode', 'Copy'))
      .expect(409);
    expect(res.body.code).toBe('SLUG_ALREADY_TAKEN');
  });

  it('previews a project by id, with its draft', async () => {
    const geode = await create('projects', project('geode'));
    await admin(
      'post',
      `/admin/collections/projects/${geode.id}/publish`,
    ).expect(200);
    await admin('put', `/admin/collections/projects/${geode.id}`)
      .send(project('geode-renamed', 'Renamed'))
      .expect(200);

    const res = await admin(
      'get',
      `/admin/preview/projects/${geode.id}`,
    ).expect(200);
    expect(res.body.data).toMatchObject({
      slug: 'geode-renamed',
      title: 'Renamed',
    });
  });

  it('refuses to delete media that a draft still uses', async () => {
    const media = await admin('post', '/admin/media')
      .send({
        kind: 'IMAGE',
        url: '/uploads/cover.png',
        mimeType: 'image/png',
        sizeBytes: 10,
        storageKey: 'media/cover.png',
      })
      .expect(201);
    const mediaId = media.body.data.id as string;
    const geode = await create('projects', project('geode'));
    await admin(
      'post',
      `/admin/collections/projects/${geode.id}/publish`,
    ).expect(200);
    await admin('put', `/admin/collections/projects/${geode.id}`)
      .send({ ...project('geode'), coverId: mediaId })
      .expect(200);

    const refused = await admin('delete', `/admin/media/${mediaId}`).expect(
      409,
    );
    expect(refused.body.message).toContain('project "Geode"');

    await admin(
      'post',
      `/admin/collections/projects/${geode.id}/discard`,
    ).expect(200);
    const deleted = await admin('delete', `/admin/media/${mediaId}`).expect(
      200,
    );
    expect(deleted.body.data.storageKey).toBe('media/cover.png');
  });

  it("only takes a WebVTT file as a video's captions", async () => {
    const add = (body: object) =>
      admin('post', '/admin/media').send(body).expect(201);
    const video = await add({
      kind: 'VIDEO',
      url: '/uploads/a.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1,
      storageKey: 'a.mp4',
    });
    const vtt = await add({
      kind: 'FILE',
      url: '/uploads/a.vtt',
      mimeType: 'text/vtt',
      sizeBytes: 1,
      storageKey: 'a.vtt',
    });
    const image = await add({
      kind: 'IMAGE',
      url: '/uploads/a.png',
      mimeType: 'image/png',
      sizeBytes: 1,
      storageKey: 'a.png',
    });

    await admin('put', `/admin/media/${video.body.data.id}`)
      .send({ alt: 'Demo', captionsId: image.body.data.id })
      .expect(400);
    await admin('put', `/admin/media/${image.body.data.id}`)
      .send({ alt: 'Cover', captionsId: vtt.body.data.id })
      .expect(400);
    await admin('put', `/admin/media/${video.body.data.id}`)
      .send({ alt: 'Demo', captionsId: vtt.body.data.id })
      .expect(200);
  });

  it('runs the inbox: counts, read, archive and delete', async () => {
    const message = (name: string) =>
      db.contactMessage.create({
        data: {
          idempotencyKey: crypto.randomUUID(),
          name,
          email: `${name}@example.com`,
          message: 'Hello there, a test message.',
          ipHash: 'x',
        },
      });
    const a = await message('a');
    await message('b');

    await admin('put', `/admin/messages/${a.id}/status`)
      .send({ status: 'ARCHIVED' })
      .expect(200);
    const inbox = await admin('get', '/admin/messages').expect(200);
    expect(inbox.body.data.counts).toEqual({ NEW: 1, READ: 0, ARCHIVED: 1 });
    expect(
      inbox.body.data.messages.map((m: { name: string }) => m.name),
    ).toEqual(['b']);
    expect(inbox.body.data.messages[0]).not.toHaveProperty('ipHash');

    await admin('delete', `/admin/messages/${a.id}`).expect(200);
    await admin('delete', `/admin/messages/${a.id}`).expect(404);
  });

  it('needs a signed-in session for every admin route', async () => {
    for (const path of [
      '/admin/collections/stats',
      '/admin/media',
      '/admin/messages',
      '/admin/profile',
      '/admin/preview/site',
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set('x-admin-secret', 'db-test-admin-secret-0123456789abcdefgh')
        .expect(401);
    }
  });
});
