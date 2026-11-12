import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../../web/src/App.tsx';
test('web app cold-start renders its branded loading state before bootstrap data arrives', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', {
    value: { pathname: '/', search: '' },
    configurable: true,
  });
  try {
    const html = renderToString(React.createElement(App));
    assert.ok(html.includes('/brand/logo.png'));
    assert.ok(html.includes('Getting the good stuff ready'));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'location', previous);
    else delete (globalThis as any).location;
  }
});
