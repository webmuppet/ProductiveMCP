/**
 * Tier 1: Schema tests for activity Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  ActivityEventSchema,
  ActivityTypeSchema,
  ACTIVITY_TYPE_IDS,
  ListActivitiesSchema,
  GetActivitySchema,
  ListTaskActivitiesSchema,
  ListProjectActivitiesSchema,
} from '../../src/schemas/activity.js';

// ─── ACTIVITY_TYPE_IDS ────────────────────────────────────────────────────────

describe('ACTIVITY_TYPE_IDS', () => {
  it('maps comment to 1', () => expect(ACTIVITY_TYPE_IDS.comment).toBe(1));
  it('maps changeset to 2', () => expect(ACTIVITY_TYPE_IDS.changeset).toBe(2));
  it('maps email to 3', () => expect(ACTIVITY_TYPE_IDS.email).toBe(3));
});

// ─── ActivityEventSchema ──────────────────────────────────────────────────────

describe('ActivityEventSchema', () => {
  it('accepts create', () => expect(ActivityEventSchema.safeParse('create').success).toBe(true));
  it('accepts update', () => expect(ActivityEventSchema.safeParse('update').success).toBe(true));
  it('accepts edit', () => expect(ActivityEventSchema.safeParse('edit').success).toBe(true));
  it('accepts delete', () => expect(ActivityEventSchema.safeParse('delete').success).toBe(true));
  it('accepts copy', () => expect(ActivityEventSchema.safeParse('copy').success).toBe(true));
  it('rejects invalid event', () => expect(ActivityEventSchema.safeParse('archive').success).toBe(false));
});

// ─── ActivityTypeSchema ───────────────────────────────────────────────────────

describe('ActivityTypeSchema', () => {
  it('accepts comment', () => expect(ActivityTypeSchema.safeParse('comment').success).toBe(true));
  it('accepts changeset', () => expect(ActivityTypeSchema.safeParse('changeset').success).toBe(true));
  it('accepts email', () => expect(ActivityTypeSchema.safeParse('email').success).toBe(true));
  it('rejects invalid type', () => expect(ActivityTypeSchema.safeParse('attachment').success).toBe(false));
});

// ─── ListActivitiesSchema ─────────────────────────────────────────────────────

describe('ListActivitiesSchema', () => {
  it('accepts empty input (all defaults)', () => {
    expect(ListActivitiesSchema.safeParse({}).success).toBe(true);
  });

  it('applies default limit=20', () => {
    expect(ListActivitiesSchema.parse({}).limit).toBe(20);
  });

  it('applies default offset=0', () => {
    expect(ListActivitiesSchema.parse({}).offset).toBe(0);
  });

  it('applies default response_format=markdown', () => {
    expect(ListActivitiesSchema.parse({}).response_format).toBe('markdown');
  });

  it('accepts deal_id filter', () => {
    expect(ListActivitiesSchema.parse({ deal_id: '123' }).deal_id).toBe('123');
  });

  it('accepts task_id filter', () => {
    expect(ListActivitiesSchema.parse({ task_id: '456' }).task_id).toBe('456');
  });

  it('accepts project_id filter', () => {
    expect(ListActivitiesSchema.parse({ project_id: '789' }).project_id).toBe('789');
  });

  it('accepts company_id filter', () => {
    expect(ListActivitiesSchema.parse({ company_id: '111' }).company_id).toBe('111');
  });

  it('accepts person_id filter', () => {
    expect(ListActivitiesSchema.parse({ person_id: '222' }).person_id).toBe('222');
  });

  it('accepts creator_id filter', () => {
    expect(ListActivitiesSchema.parse({ creator_id: '333' }).creator_id).toBe('333');
  });

  it('accepts event=create', () => {
    expect(ListActivitiesSchema.parse({ event: 'create' }).event).toBe('create');
  });

  it('accepts event=delete', () => {
    expect(ListActivitiesSchema.parse({ event: 'delete' }).event).toBe('delete');
  });

  it('rejects invalid event', () => {
    expect(ListActivitiesSchema.safeParse({ event: 'archive' }).success).toBe(false);
  });

  it('accepts activity_type=comment', () => {
    expect(ListActivitiesSchema.parse({ activity_type: 'comment' }).activity_type).toBe('comment');
  });

  it('accepts activity_type=changeset', () => {
    expect(ListActivitiesSchema.parse({ activity_type: 'changeset' }).activity_type).toBe('changeset');
  });

  it('accepts activity_type=email', () => {
    expect(ListActivitiesSchema.parse({ activity_type: 'email' }).activity_type).toBe('email');
  });

  it('rejects invalid activity_type', () => {
    expect(ListActivitiesSchema.safeParse({ activity_type: 'attachment' }).success).toBe(false);
  });

  it('accepts after date string', () => {
    expect(ListActivitiesSchema.parse({ after: '2025-01-01' }).after).toBe('2025-01-01');
  });

  it('accepts before date string', () => {
    expect(ListActivitiesSchema.parse({ before: '2025-12-31' }).before).toBe('2025-12-31');
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(ListActivitiesSchema.safeParse({ unknown: true }).success).toBe(false);
  });
});

// ─── GetActivitySchema ────────────────────────────────────────────────────────

describe('GetActivitySchema', () => {
  it('accepts valid activity_id', () => {
    expect(GetActivitySchema.parse({ activity_id: '42' }).activity_id).toBe('42');
  });

  it('rejects missing activity_id', () => {
    expect(GetActivitySchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty activity_id', () => {
    expect(GetActivitySchema.safeParse({ activity_id: '' }).success).toBe(false);
  });

  it('applies default response_format=markdown', () => {
    expect(GetActivitySchema.parse({ activity_id: '42' }).response_format).toBe('markdown');
  });

  it('accepts response_format=json', () => {
    expect(GetActivitySchema.parse({ activity_id: '42', response_format: 'json' }).response_format).toBe('json');
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(GetActivitySchema.safeParse({ activity_id: '42', extra: true }).success).toBe(false);
  });
});

// ─── ListTaskActivitiesSchema ─────────────────────────────────────────────────

describe('ListTaskActivitiesSchema', () => {
  it('accepts required task_id', () => {
    expect(ListTaskActivitiesSchema.parse({ task_id: '99' }).task_id).toBe('99');
  });

  it('rejects missing task_id', () => {
    expect(ListTaskActivitiesSchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty task_id', () => {
    expect(ListTaskActivitiesSchema.safeParse({ task_id: '' }).success).toBe(false);
  });

  it('applies default limit=20', () => {
    expect(ListTaskActivitiesSchema.parse({ task_id: '99' }).limit).toBe(20);
  });

  it('applies default offset=0', () => {
    expect(ListTaskActivitiesSchema.parse({ task_id: '99' }).offset).toBe(0);
  });

  it('applies default response_format=markdown', () => {
    expect(ListTaskActivitiesSchema.parse({ task_id: '99' }).response_format).toBe('markdown');
  });

  it('accepts event filter', () => {
    expect(ListTaskActivitiesSchema.parse({ task_id: '99', event: 'update' }).event).toBe('update');
  });

  it('accepts activity_type filter', () => {
    expect(ListTaskActivitiesSchema.parse({ task_id: '99', activity_type: 'comment' }).activity_type).toBe('comment');
  });

  it('accepts after and before', () => {
    const result = ListTaskActivitiesSchema.parse({
      task_id: '99',
      after: '2025-01-01',
      before: '2025-06-30',
    });
    expect(result.after).toBe('2025-01-01');
    expect(result.before).toBe('2025-06-30');
  });

  it('rejects invalid event', () => {
    expect(ListTaskActivitiesSchema.safeParse({ task_id: '99', event: 'reopen' }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(ListTaskActivitiesSchema.safeParse({ task_id: '99', unknown: true }).success).toBe(false);
  });
});

// ─── ListProjectActivitiesSchema ──────────────────────────────────────────────

describe('ListProjectActivitiesSchema', () => {
  it('accepts required project_id', () => {
    expect(ListProjectActivitiesSchema.parse({ project_id: '77' }).project_id).toBe('77');
  });

  it('rejects missing project_id', () => {
    expect(ListProjectActivitiesSchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty project_id', () => {
    expect(ListProjectActivitiesSchema.safeParse({ project_id: '' }).success).toBe(false);
  });

  it('applies default limit=20', () => {
    expect(ListProjectActivitiesSchema.parse({ project_id: '77' }).limit).toBe(20);
  });

  it('applies default offset=0', () => {
    expect(ListProjectActivitiesSchema.parse({ project_id: '77' }).offset).toBe(0);
  });

  it('applies default response_format=markdown', () => {
    expect(ListProjectActivitiesSchema.parse({ project_id: '77' }).response_format).toBe('markdown');
  });

  it('accepts all optional filters together', () => {
    const result = ListProjectActivitiesSchema.parse({
      project_id: '77',
      event: 'create',
      activity_type: 'changeset',
      after: '2025-01-01',
      before: '2025-12-31',
      limit: 50,
      offset: 100,
    });
    expect(result.event).toBe('create');
    expect(result.activity_type).toBe('changeset');
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(100);
  });

  it('rejects invalid activity_type', () => {
    expect(ListProjectActivitiesSchema.safeParse({ project_id: '77', activity_type: 'note' }).success).toBe(false);
  });

  it('rejects unknown fields (strict mode)', () => {
    expect(ListProjectActivitiesSchema.safeParse({ project_id: '77', unknown: true }).success).toBe(false);
  });
});
