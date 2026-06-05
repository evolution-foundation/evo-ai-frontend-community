import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import manifest from './journey-node-manifest.json';

// Parity guard (EVO-1634): the manifest is the cross-repo contract the evo-flow
// Temporal executor reads to assert every Journey palette node has an executor
// case. This test keeps the manifest honest against the real JourneyFlowEditor
// `nodeTypes` so it can't silently drift.
describe('journey node manifest parity (EVO-1634)', () => {
  it('lists exactly the node types referenced in JourneyFlowEditor', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/pages/Customer/Journey/JourneyFlowEditor.tsx'),
      'utf8',
    );
    const referenced = Array.from(
      new Set([...src.matchAll(/'([a-z-]+-node)':/g)].map(m => m[1])),
    ).sort();

    expect([...manifest.nodeTypes].sort()).toEqual(referenced);
  });
});
