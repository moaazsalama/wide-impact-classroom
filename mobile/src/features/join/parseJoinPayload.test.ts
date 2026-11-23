import { describe, expect, it } from '@jest/globals';

import { buildJoinUrl, isValidJoinCode, parseJoinPayload } from './parseJoinPayload';

describe('parseJoinPayload', () => {
  it.each([
    ['483920', '483920'],
    ['  483920\n', '483920'],
    ['000000', '000000'],
    ['wideimpactclassroom://join?code=483920', '483920'],
    ['WideImpactClassroom://join?code=483920', '483920'],
    ['wideimpactclassroom:///join?code=483920', '483920'],
    ['wideimpactclassroom://join/?code=483920', '483920'],
    ['wideimpactclassroom://join?foo=1&code=483920', '483920'],
    ['https://classroom.example.com/join?code=483920', '483920'],
  ])('accepts %j', (input, expected) => {
    expect(parseJoinPayload(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['12345'],
    ['1234567'],
    ['12a456'],
    ['wideimpactclassroom://join?code=12345'],
    ['wideimpactclassroom://join?code=abcdef'],
    ['wideimpactclassroom://join'],
    ['wideimpactclassroom://classrooms?code=483920'],
    ['otherapp://join?code=483920'],
    ['https://example.com/?code=483920'],
    ['hello world'],
  ])('rejects %j', (input) => {
    expect(parseJoinPayload(input)).toBeNull();
  });

  it('round-trips with buildJoinUrl', () => {
    expect(buildJoinUrl('483920')).toBe('wideimpactclassroom://join?code=483920');
    expect(parseJoinPayload(buildJoinUrl('483920'))).toBe('483920');
  });

  it('validates codes', () => {
    expect(isValidJoinCode('123456')).toBe(true);
    expect(isValidJoinCode('12345')).toBe(false);
    expect(isValidJoinCode(undefined)).toBe(false);
  });
});
