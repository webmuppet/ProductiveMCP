/**
 * Tier 2: Unit tests for page tool handlers (mocked client)
 */

import { describe, it, expect, vi } from 'vitest';
import { createPage, deletePage, getPage, updatePage } from '../../src/tools/pages.js';
import { createMockClient, mockPageResponse } from '../helpers/mock-client.js';

// ─── createPage ───────────────────────────────────────────────────────────────

describe('createPage', () => {
  it('sends correct JSON:API type and title for top-level page', async () => {
    const client = createMockClient({ post: mockPageResponse('1') });

    await createPage(client, { title: 'Top Level', response_format: 'markdown' });

    expect(client.post).toHaveBeenCalledWith(
      '/pages',
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'pages',
          attributes: expect.objectContaining({ title: 'Top Level' }),
        }),
      }),
    );
  });

  it('does not include relationships for a top-level page', async () => {
    const client = createMockClient({ post: mockPageResponse('1') });

    await createPage(client, { title: 'Top Level', response_format: 'markdown' });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { relationships?: unknown };
    };
    // No relationships or an empty object — no project/parent/root attached
    const rel = payload.data.relationships;
    expect(rel).toBeUndefined();
  });

  it('includes project relationship when project_id provided', async () => {
    const client = createMockClient({ post: mockPageResponse('1') });

    await createPage(client, { title: 'Spec', project_id: '999', response_format: 'markdown' });

    expect(client.post).toHaveBeenCalledWith(
      '/pages',
      expect.objectContaining({
        data: expect.objectContaining({
          relationships: expect.objectContaining({
            project: { data: { type: 'projects', id: '999' } },
          }),
        }),
      }),
    );
  });

  it('includes both parent_page and root_page relationships for child page', async () => {
    const client = createMockClient({ post: mockPageResponse('2') });

    await createPage(client, {
      title: 'Child',
      project_id: '1',
      parent_page_id: '100',
      root_page_id: '50',
      response_format: 'markdown',
    });

    expect(client.post).toHaveBeenCalledWith(
      '/pages',
      expect.objectContaining({
        data: expect.objectContaining({
          relationships: expect.objectContaining({
            parent_page: { data: { type: 'pages', id: '100' } },
            root_page: { data: { type: 'pages', id: '50' } },
          }),
        }),
      }),
    );
  });

  it('converts markdown body to a JSON string (Productive doc format)', async () => {
    const client = createMockClient({ post: mockPageResponse('3') });
    const markdownBody = '# Heading\n\nA paragraph of text.';

    await createPage(client, { title: 'With Body', body: markdownBody, response_format: 'markdown' });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { attributes: { body?: unknown } };
    };
    const body = payload.data.attributes.body;

    // Body must be a string containing valid JSON (Productive doc format)
    expect(typeof body).toBe('string');
    const parsed = JSON.parse(body as string);
    expect(parsed.type).toBe('doc');
    expect(Array.isArray(parsed.content)).toBe(true);
  });

  it('omits body attribute when no body provided', async () => {
    const client = createMockClient({ post: mockPageResponse('4') });

    await createPage(client, { title: 'No Body', response_format: 'markdown' });

    const payload = (client.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { attributes: Record<string, unknown> };
    };
    expect('body' in payload.data.attributes).toBe(false);
  });

  it('returns markdown string by default', async () => {
    const client = createMockClient({ post: mockPageResponse('5', { title: 'My Page' }) });

    const result = await createPage(client, { title: 'My Page', response_format: 'markdown' });

    expect(typeof result).toBe('string');
    expect(result).toContain('My Page');
  });

  it('returns JSON string when response_format is json', async () => {
    const client = createMockClient({ post: mockPageResponse('6', { title: 'JSON Page' }) });

    const result = await createPage(client, { title: 'JSON Page', response_format: 'json' });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('id', '6');
    expect(parsed).toHaveProperty('title', 'JSON Page');
  });
});

// ─── deletePage ───────────────────────────────────────────────────────────────

describe('deletePage', () => {
  it('calls DELETE on the correct endpoint', async () => {
    const client = createMockClient();

    const result = await deletePage(client, { page_id: '42' });

    expect(client.delete).toHaveBeenCalledWith('/pages/42');
    expect(result).toContain('42');
    expect(result).toContain('deleted successfully');
  });
});

// ─── getPage ──────────────────────────────────────────────────────────────────

describe('getPage', () => {
  it('calls GET on the correct endpoint', async () => {
    const client = createMockClient({ get: mockPageResponse('77', { title: 'Found Page' }) });

    await getPage(client, { page_id: '77', response_format: 'markdown' });

    expect(client.get).toHaveBeenCalledWith('/pages/77');
  });

  it('returns markdown containing the page title', async () => {
    const client = createMockClient({ get: mockPageResponse('77', { title: 'Found Page' }) });

    const result = await getPage(client, { page_id: '77', response_format: 'markdown' });

    expect(result).toContain('Found Page');
  });
});

// ─── updatePage ───────────────────────────────────────────────────────────────

describe('updatePage', () => {
  it('sends PATCH to the correct endpoint', async () => {
    const client = createMockClient({ patch: mockPageResponse('55', { title: 'Updated' }) });

    await updatePage(client, { page_id: '55', title: 'Updated', response_format: 'markdown' });

    expect(client.patch).toHaveBeenCalledWith(
      '/pages/55',
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'pages',
          id: '55',
        }),
      }),
    );
  });

  it('sends null body to clear page content', async () => {
    const client = createMockClient({ patch: mockPageResponse('55') });

    await updatePage(client, { page_id: '55', body: null, response_format: 'markdown' });

    const payload = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { attributes?: { body?: unknown } };
    };
    expect(payload.data.attributes?.body).toBeNull();
  });

  it('converts markdown body to Productive doc format on update', async () => {
    const client = createMockClient({ patch: mockPageResponse('55') });

    await updatePage(client, { page_id: '55', body: '# Updated\n\nNew content.', response_format: 'markdown' });

    const payload = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { attributes?: { body?: unknown } };
    };
    const body = payload.data.attributes?.body;
    expect(typeof body).toBe('string');
    const parsed = JSON.parse(body as string);
    expect(parsed.type).toBe('doc');
  });

  it('omits attributes entirely when no fields to update', async () => {
    const client = createMockClient({ patch: mockPageResponse('55') });

    await updatePage(client, { page_id: '55', response_format: 'markdown' });

    const payload = (client.patch as ReturnType<typeof vi.fn>).mock.calls[0][1] as {
      data: { attributes?: unknown };
    };
    expect(payload.data.attributes).toBeUndefined();
  });
});
