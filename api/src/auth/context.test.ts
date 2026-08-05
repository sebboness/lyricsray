import { describe, it, expect } from 'vitest';
import { AuthorizerInfo } from './context';

describe('AuthorizerInfo', () => {
  it('reports no info when constructed with null claims', () => {
    const info = new AuthorizerInfo(null);

    expect(info.hasInfo()).toBe(false);
    expect(info.getUserId()).toBe('');
    expect(info.getUsername()).toBe('');
    expect(info.getEmail()).toBe('');
    expect(info.getFullName()).toBe('');
  });

  it('reports no info when claims are missing a sub', () => {
    const info = new AuthorizerInfo({ sub: '' } as any);

    expect(info.hasInfo()).toBe(false);
  });

  it('exposes claim values when verified claims are present', () => {
    const info = new AuthorizerInfo({
      sub: 'user-1',
      email: 'admin@example.com',
      'cognito:username': 'admin',
      name: 'Admin Person',
    });

    expect(info.hasInfo()).toBe(true);
    expect(info.getUserId()).toBe('user-1');
    expect(info.getUsername()).toBe('admin');
    expect(info.getEmail()).toBe('admin@example.com');
    expect(info.getFullName()).toBe('Admin Person');
  });
});
