import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import AboutPage from '../app/about/page';
test('About page credits the creator and the development contributor with their LinkedIn links',()=>{
 const html=renderToStaticMarkup(AboutPage());
 assert.match(html,/href="https:\/\/www\.linkedin\.com\/in\/zhrsidd\/"[^>]*>Zuhayr Siddique<\/a> — Creator/);
 assert.match(html,/href="https:\/\/www\.linkedin\.com\/in\/john-paul-ribeiru-797b2442b"[^>]*>John Paul Ribeiru<\/a> — Development Contributor/);
 assert.ok(html.includes('Copyright © 2026 Zuhayr Siddique. All rights reserved.'));
 assert.ok(html.includes('rel="noopener noreferrer"'));
});
