// apps/backend/src/permissions/rules.unit.test.ts
import { describe, it, expect } from 'vitest';
import { can } from './rules.js';
import {
  isRoleAtLeast,
  isSysadmin,
  resolveEffectiveBaseRole,
  type PermissionContext,
} from './types.js';

const ctx = (over?: Partial<PermissionContext>): PermissionContext => ({
  userId: 1,
  platformRole: 'USER',
  canCreateBases: false,
  baseId: 999,
  baseVisibility: 'PRIVATE',
  isOwner: false,
  membershipRole: undefined,
  ...over,
});

describe('helpers', () => {
  it('isSysadmin', () => {
    expect(isSysadmin({ platformRole: 'SYSADMIN' })).toBe(true);
    expect(isSysadmin({ platformRole: 'USER' })).toBe(false);
  });

  it('isRoleAtLeast', () => {
    expect(isRoleAtLeast('EDITOR', 'VIEWER')).toBe(true);
    expect(isRoleAtLeast('COMMENTER', 'EDITOR')).toBe(false);
  });

  it('resolveEffectiveBaseRole', () => {
    expect(resolveEffectiveBaseRole(ctx({ platformRole: 'SYSADMIN' }))).toBe('EDITOR');
    expect(resolveEffectiveBaseRole(ctx({ isOwner: true }))).toBe('EDITOR');
    expect(resolveEffectiveBaseRole(ctx({ membershipRole: 'COMMENTER' }))).toBe('COMMENTER');
    expect(resolveEffectiveBaseRole(ctx({ baseVisibility: 'PUBLIC' }))).toBe('VIEWER');
    expect(resolveEffectiveBaseRole(ctx())).toBeUndefined();
  });
});

describe('can()', () => {
  it('SYSADMIN: prácticamente todo', () => {
    const c = ctx({ platformRole: 'SYSADMIN' });
    expect(can(c, 'base:view')).toBe(true);
    expect(can(c, 'records:read')).toBe(true);
    expect(can(c, 'records:create')).toBe(true);
    expect(can(c, 'records:update')).toBe(true);
    expect(can(c, 'records:delete')).toBe(true);
    expect(can(c, 'comments:create')).toBe(true);
    expect(can(c, 'schema:manage')).toBe(true);
    expect(can(c, 'members:manage')).toBe(true);
    expect(can(c, 'base:visibility')).toBe(true);
    expect(can(c, 'base:delete')).toBe(true);
    expect(can(c, 'bases:create')).toBe(true);
    expect(can(c, 'platform:users:manage')).toBe(true);
  });

  it('Owner: administra su base', () => {
    const c = ctx({ isOwner: true });
    expect(can(c, 'base:view')).toBe(true);
    expect(can(c, 'records:read')).toBe(true);
    expect(can(c, 'records:create')).toBe(true);
    expect(can(c, 'records:update')).toBe(true);
    expect(can(c, 'records:delete')).toBe(true);
    expect(can(c, 'comments:create')).toBe(true);
    expect(can(c, 'schema:manage')).toBe(true);
    expect(can(c, 'members:manage')).toBe(true);
    expect(can(c, 'base:visibility')).toBe(true);
    expect(can(c, 'base:delete')).toBe(true);
    expect(can(c, 'platform:users:manage')).toBe(false);
    expect(can(c, 'bases:create')).toBe(false);
  });

  it('EDITOR (privada): CRUD de registros, NO administrar base', () => {
    const c = ctx({ membershipRole: 'EDITOR' });
    expect(can(c, 'base:view')).toBe(true);
    expect(can(c, 'records:read')).toBe(true);
    expect(can(c, 'records:create')).toBe(true);
    expect(can(c, 'records:update')).toBe(true);
    expect(can(c, 'records:delete')).toBe(true);
    expect(can(c, 'comments:create')).toBe(true);
    expect(can(c, 'schema:manage')).toBe(false);
    expect(can(c, 'members:manage')).toBe(false);
    expect(can(c, 'base:visibility')).toBe(false);
    expect(can(c, 'base:delete')).toBe(false);
  });

  it('COMMENTER (privada): leer y comentar', () => {
    const c = ctx({ membershipRole: 'COMMENTER' });
    expect(can(c, 'base:view')).toBe(true);
    expect(can(c, 'records:read')).toBe(true);
    expect(can(c, 'comments:create')).toBe(true);
    expect(can(c, 'records:create')).toBe(false);
    expect(can(c, 'records:update')).toBe(false);
    expect(can(c, 'records:delete')).toBe(false);
  });

  it('VIEWER (privada): solo lectura', () => {
    const c = ctx({ membershipRole: 'VIEWER' });
    expect(can(c, 'base:view')).toBe(true);
    expect(can(c, 'records:read')).toBe(true);
    expect(can(c, 'comments:create')).toBe(false);
    expect(can(c, 'records:create')).toBe(false);
    expect(can(c, 'records:update')).toBe(false);
    expect(can(c, 'records:delete')).toBe(false);
  });

  it('Sin membership en base PÚBLICA: lectura sí, escribir no', () => {
    const c = ctx({ baseVisibility: 'PUBLIC' });
    expect(can(c, 'base:view')).toBe(true);
    expect(can(c, 'records:read')).toBe(true);
    expect(can(c, 'comments:create')).toBe(false);
    expect(can(c, 'records:create')).toBe(false);
  });

  it('Sin membership en base PRIVADA: sin acceso', () => {
    const c = ctx(); // privada por defecto
    expect(can(c, 'base:view')).toBe(false);
    expect(can(c, 'records:read')).toBe(false);
    expect(can(c, 'comments:create')).toBe(false);
  });

  it('bases:create: solo SYSADMIN o canCreateBases=true', () => {
    const normal = ctx();
    const creator = ctx({ canCreateBases: true });
    const sys = ctx({ platformRole: 'SYSADMIN' });
    expect(can(normal, 'bases:create')).toBe(false);
    expect(can(creator, 'bases:create')).toBe(true);
    expect(can(sys, 'bases:create')).toBe(true);
  });

  it('platform:users:manage: solo SYSADMIN', () => {
    const user = ctx();
    const sys = ctx({ platformRole: 'SYSADMIN' });
    expect(can(user, 'platform:users:manage')).toBe(false);
    expect(can(sys, 'platform:users:manage')).toBe(true);
  });
});