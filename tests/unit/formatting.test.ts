/**
 * Tier 2: Unit tests for formatting utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  markdownToHtml,
  markdownToProductiveDocString,
  markdownToProductiveDoc,
  formatResponse,
  truncateResponse,
} from '../../src/utils/formatting.js';

// ─── markdownToHtml ───────────────────────────────────────────────────────────

describe('markdownToHtml', () => {
  it('converts bold markdown to HTML', () => {
    const result = markdownToHtml('**bold text**');
    expect(result).toContain('<strong>bold text</strong>');
  });

  it('converts italic markdown to HTML', () => {
    const result = markdownToHtml('*italic text*');
    expect(result).toContain('<em>italic text</em>');
  });

  it('converts heading to HTML heading tag', () => {
    const result = markdownToHtml('# Heading One');
    expect(result).toContain('<h1>');
    expect(result).toContain('Heading One');
  });

  it('converts unordered list to HTML', () => {
    const result = markdownToHtml('- Item one\n- Item two');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('returns empty/whitespace input unchanged', () => {
    expect(markdownToHtml('')).toBe('');
    expect(markdownToHtml('   ')).toBe('   ');
  });

  it('returns plain text without markdown wrappers', () => {
    const result = markdownToHtml('Just plain text.');
    expect(result).toContain('Just plain text.');
  });
});

// ─── markdownToProductiveDocString ───────────────────────────────────────────

describe('markdownToProductiveDocString', () => {
  it('returns a string', () => {
    const result = markdownToProductiveDocString('# Hello');
    expect(typeof result).toBe('string');
  });

  it('returns valid JSON', () => {
    const result = markdownToProductiveDocString('Some content');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('output JSON has type "doc" at root', () => {
    const result = markdownToProductiveDocString('# Heading\n\nParagraph.');
    const parsed = JSON.parse(result);
    expect(parsed.type).toBe('doc');
  });

  it('output JSON has a content array', () => {
    const result = markdownToProductiveDocString('Hello world');
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed.content)).toBe(true);
  });

  it('produces empty doc for empty input', () => {
    const result = markdownToProductiveDocString('');
    const parsed = JSON.parse(result);
    expect(parsed.type).toBe('doc');
    expect(parsed.content).toHaveLength(0);
  });
});

// ─── markdownToProductiveDoc ──────────────────────────────────────────────────

describe('markdownToProductiveDoc', () => {
  it('returns a doc object for heading markdown', () => {
    const doc = markdownToProductiveDoc('# My Heading');
    expect(doc.type).toBe('doc');
    expect(doc.content.length).toBeGreaterThan(0);
  });

  it('creates a heading node for H1', () => {
    const doc = markdownToProductiveDoc('# Title');
    const headingNode = doc.content.find((n) => n.type === 'heading');
    expect(headingNode).toBeDefined();
  });

  it('creates a paragraph node for plain text', () => {
    const doc = markdownToProductiveDoc('A paragraph.');
    const paraNode = doc.content.find((n) => n.type === 'paragraph');
    expect(paraNode).toBeDefined();
  });

  it('returns empty doc for empty string', () => {
    const doc = markdownToProductiveDoc('');
    expect(doc.type).toBe('doc');
    expect(doc.content).toHaveLength(0);
  });
});

// ─── formatResponse ───────────────────────────────────────────────────────────

describe('formatResponse', () => {
  const data = { id: '1', name: 'Test' };

  it('calls markdown function and returns its output when format is "markdown"', () => {
    const result = formatResponse(data, 'markdown', () => '# Test\n\nMarkdown content');
    expect(result).toBe('# Test\n\nMarkdown content');
  });

  it('returns JSON-serialised data when format is "json"', () => {
    const result = formatResponse(data, 'json', () => 'should not appear');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual(data);
  });

  it('JSON output does not include markdown string', () => {
    const result = formatResponse(data, 'json', () => 'MARKDOWN_MARKER');
    expect(result).not.toContain('MARKDOWN_MARKER');
  });
});

// ─── truncateResponse ─────────────────────────────────────────────────────────

describe('truncateResponse', () => {
  it('returns short responses unchanged', () => {
    const short = 'Short response.';
    expect(truncateResponse(short, 'markdown')).toBe(short);
  });

  it('truncates markdown responses exceeding CHARACTER_LIMIT', () => {
    const long = 'x'.repeat(26_000);
    const result = truncateResponse(long, 'markdown');
    expect(result.length).toBeLessThan(long.length);
    expect(result).toContain('truncated');
  });

  it('truncates json responses exceeding CHARACTER_LIMIT', () => {
    const long = 'x'.repeat(26_000);
    const result = truncateResponse(long, 'json');
    expect(result.length).toBeLessThan(long.length);
  });
});
