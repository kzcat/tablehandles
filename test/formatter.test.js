'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, toPlain, toMarkdown } = require('../src/formatter.js');

describe('normalize', () => {
  it('改行を空白に変換', () => { assert.equal(normalize('a\nb'), 'a b'); });
  it('連続空白を圧縮', () => { assert.equal(normalize('a   b'), 'a b'); });
  it('前後をtrim', () => { assert.equal(normalize('  a  '), 'a'); });
});

describe('toPlain', () => {
  it('複数行はTSV', () => { assert.equal(toPlain([['a','b'],['c','d']]), 'a\tb\nc\td'); });
  it('1x1は素の値', () => { assert.equal(toPlain([['x']]), 'x'); });
});

describe('toMarkdown', () => {
  it('ヘッダと---区切り', () => {
    const r = toMarkdown([['h1','h2'],['a','b']]);
    assert.match(r, /\| h1 \| h2 \|/);
    assert.match(r, /\| --- \| --- \|/);
  });
  it('セル内|を\\|にエスケープ', () => {
    const r = toMarkdown([['a|b'],['c']]);
    assert.match(r, /a\\\|b/);
  });
  it('1x1は素の値', () => { assert.equal(toMarkdown([['x']]), 'x'); });
});
