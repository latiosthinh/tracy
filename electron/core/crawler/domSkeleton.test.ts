import { describe, it, expect } from 'vitest';
import { extractStructuralSkeleton, computeDomSkeletonHash } from './domSkeleton';

describe('DOM Skeleton Hashing', () => {
  it('extractStructuralSkeleton strips dynamic text and attributes while retaining structural roles and tags', () => {
    const html1 = `
      <div id="user-12345-dynamic" class="flex p-4 theme-dark" style="color: red; margin-top: 10px;">
        <h1 id="title-999">Dashboard Header - 2026-08-19 12:00</h1>
        <main role="main">
          <button id="btn-uuid-99a" type="button" role="button" aria-label="Submit Order">Click Me Now!</button>
          <input type="text" name="username" placeholder="Enter username" />
        </main>
      </div>
    `;

    const skeleton = extractStructuralSkeleton(html1);
    expect(skeleton).not.toContain('Dashboard Header');
    expect(skeleton).not.toContain('color: red');
    expect(skeleton).not.toContain('user-12345-dynamic');
    expect(skeleton).toContain('div');
    expect(skeleton).toContain('h1');
    expect(skeleton).toContain('main');
    expect(skeleton).toContain('button');
    expect(skeleton).toContain('input');
    expect(skeleton).toContain('role="main"');
    expect(skeleton).toContain('role="button"');
  });

  it('computeDomSkeletonHash returns identical hashes for identical structures with different volatile content', () => {
    const htmlA = `
      <div class="user-card" id="user-111">
        <span class="name">Alice Wonderland</span>
        <span class="timestamp">Updated 2 mins ago</span>
        <button class="btn btn-primary" id="btn-111">View Profile</button>
      </div>
    `;

    const htmlB = `
      <div class="user-card" id="user-222">
        <span class="name">Bob Builder</span>
        <span class="timestamp">Updated 5 hours ago</span>
        <button class="btn btn-primary" id="btn-222">View Profile</button>
      </div>
    `;

    const hashA = computeDomSkeletonHash(htmlA);
    const hashB = computeDomSkeletonHash(htmlB);

    expect(hashA).toBe(hashB);
    expect(typeof hashA).toBe('string');
    expect(hashA.length).toBeGreaterThan(0);
  });

  it('computeDomSkeletonHash returns different hashes when layout or tags change', () => {
    const baseHtml = `
      <nav role="navigation">
        <a href="/home">Home</a>
        <a href="/about">About</a>
      </nav>
      <main>
        <p>Main content text</p>
      </main>
    `;

    const modalOpenedHtml = `
      <nav role="navigation">
        <a href="/home">Home</a>
        <a href="/about">About</a>
      </nav>
      <main>
        <p>Main content text</p>
      </main>
      <div role="dialog" aria-modal="true" class="modal">
        <h2>Confirm Action</h2>
        <button type="button">OK</button>
      </div>
    `;

    const baseHash = computeDomSkeletonHash(baseHtml);
    const modalHash = computeDomSkeletonHash(modalOpenedHtml);

    expect(baseHash).not.toBe(modalHash);
  });

  it('handles cyclic structures or deeply nested HTML safely without crashing', () => {
    let deep = '<div>';
    for (let i = 0; i < 50; i++) {
      deep += `<div><span>Level ${i}</span>`;
    }
    for (let i = 0; i < 50; i++) {
      deep += `</div></div>`;
    }
    const hash = computeDomSkeletonHash(deep);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
});
