import type { Media } from '@repo/shared';
import { attachMedia, collectMediaIds } from './media-refs.js';

const logo: Media = {
  id: 'a3f1c2d4-5b6e-4f70-8a91-b2c3d4e5f607',
  kind: 'IMAGE',
  url: '/logo.png',
  mimeType: 'image/png',
  width: 64,
  height: 64,
  alt: 'Logo',
  captionsUrl: null,
};
const goneId = 'f0e1d2c3-b4a5-4697-8879-6a5b4c3d2e1f';

const blocks = [
  { id: 'a', type: 'richText', markdown: 'Hi' },
  { id: 'b', type: 'image', image: { mediaId: logo.id } },
  {
    id: 'c',
    type: 'gallery',
    items: [{ image: { mediaId: logo.id } }, { image: { mediaId: goneId } }],
  },
];

describe('collectMediaIds', () => {
  it('finds media ids at any depth, once each', () => {
    expect([...collectMediaIds(blocks)].sort()).toEqual(
      [logo.id, goneId].sort(),
    );
  });
});

describe('attachMedia', () => {
  it('attaches media, or null when it no longer exists', () => {
    const resolved = attachMedia(blocks, new Map([[logo.id, logo]]));
    expect(resolved).toEqual([
      blocks[0],
      { id: 'b', type: 'image', image: { mediaId: logo.id, media: logo } },
      {
        id: 'c',
        type: 'gallery',
        items: [
          { image: { mediaId: logo.id, media: logo } },
          { image: { mediaId: goneId, media: null } },
        ],
      },
    ]);
  });

  it('does not modify its input', () => {
    attachMedia(blocks, new Map([[logo.id, logo]]));
    expect(blocks[1]).toEqual({
      id: 'b',
      type: 'image',
      image: { mediaId: logo.id },
    });
  });
});
