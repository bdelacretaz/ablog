/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// Code that's specific to the developers blog

import { setupDefaultImages } from './default-images.js';
import { setupTaxonomyProxy } from './taxonomy-proxy.js';

export const SITE = {
  team: 'Adobe Developers Blog Team',
  authorsRoot: '/en/authors',
  topicsRoot: '/en/topics'
}

export function addDevBlogBlockOverrides(overrides) {
  overrides.push({
    milo: 'tags',
    blog: 'devblog-tags',
  });
  return overrides;
}

/**
 * The decision engine to decide where to get Milo's libs from.
 */
export const [setLibs, getLibs] = (() => {
  let libs;
  return [
    (prodLibs, location) => {
      libs = (() => {
        const { hostname, search } = location || window.location;
        if (!(hostname.includes('.hlx.') || hostname.includes('local'))) return prodLibs;
        const branch = new URLSearchParams(search).get('milolibs') || 'main';
        if (branch === 'local') return 'http://localhost:6456/libs';
        return branch.includes('--') ? `https://${branch}.hlx.live/libs` : `https://${branch}--milo--adobecom.hlx.live/libs`;
      })();
      return libs;
    }, () => libs,
  ];
})();

/**
 * List all components here that are found in our
 * web-components folder. This function loads the ones
 * which are actually used in the current document
 */
function loadWebComponents() {
  [
    'inline-gist'
  ].forEach(name => {
    if(document.querySelector(name)) {
      const script = document.createElement('script');
      script.setAttribute('src', `/web-components/${name}.js`);
      script.setAttribute('type', 'module');
      document.head.append(script);
    }
  })
}

/**
 * Normalizes all headings within a container element.
 * @param {Element} el The container element
 * @param {array} allowedHeadings The list of allowed headings (h1 ... h6)
 */
export function normalizeHeadings(el, allowedHeadings) {
  const allowed = allowedHeadings.map((h) => h.toLowerCase());
  el.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((tag) => {
    const h = tag.tagName.toLowerCase();
    if (allowed.indexOf(h) === -1) {
      // current heading is not in the allowed list -> try first to "promote" the heading
      let level = parseInt(h.charAt(1), 10) - 1;
      while (allowed.indexOf(`h${level}`) === -1 && level > 0) {
        level -= 1;
      }
      if (level === 0) {
        // did not find a match -> try to "downgrade" the heading
        while (allowed.indexOf(`h${level}`) === -1 && level < 7) {
          level += 1;
        }
      }
      if (level !== 7) {
        tag.outerHTML = `<h${level}>${tag.textContent}</h${level}>`;
      }
    }
  });
}

/**
 * Returns a picture element with webp and fallbacks
 * @param {string} src The image URL
 * @param {string} alt The image alt text
 * @param {boolean} eager load image eager
 * @param {Array} breakpoints breakpoints and corresponding params (eg. width)
 */
export function createOptimizedPicture(
  src,
  alt = '',
  eager = false,
  breakpoints = [{ media: '(min-width: 400px)', width: '2000' }, { width: '750' }],
) {
  const url = new URL(src, window.location.href);
  const picture = document.createElement('picture');
  const { pathname } = url;
  const ext = pathname.substring(pathname.lastIndexOf('.') + 1);

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/webp');
    source.setAttribute('srcset', `${pathname}?width=${br.width}&format=webply&optimize=medium`);
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('src', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
    }
  });

  return picture;
}

/*
 * ------------------------------------------------------------
 * Edit below at your own risk
 * ------------------------------------------------------------
 */

function getImageCaption(picture) {
  // TODO need default pictures
  if(!picture) {
    return '';
  }

  // Check if the parent element has a caption
  const parentEl = picture.parentNode;
  let caption = parentEl.querySelector('em');
  if (caption) return caption;

  // If the parent element doesn't have a caption, check if the next sibling does
  const parentSiblingEl = parentEl.nextElementSibling;
  caption = parentSiblingEl
    && !parentSiblingEl.querySelector('picture')
    && parentSiblingEl.firstChild?.tagName === 'EM'
    ? parentSiblingEl.querySelector('em')
    : undefined;
  return caption;
}

/*
  * Topic pages have a unique page header.
  * Transform it into a Milo marquee with custom blog "mini" variant.
*/
async function topicHeader(createTag) {
  const imageEl = document.querySelector('main > div:first-of-type > p > picture');
  if (!imageEl) return;

  const heading = document.querySelector('main > div > p + h1, main > div > p + h2, main > div > h1, main > div > h2');
  const container = createTag('div', { class: 'marquee mini' });
  const background = createTag('div', { class: 'background' }, imageEl);
  const text = createTag('div', {}, heading);
  const foreground = createTag('div', { class: 'foreground' }, text);
  const para = document.querySelector('main > div > p');
  container.append(background, foreground);
  para.replaceWith(container);
}

export async function decorateContent() {
  const miloLibs = getLibs();
  const imgEls = document.querySelectorAll('main > div > p > picture');
  if (!imgEls.length) return;

  const { createTag, loadStyle } = await import(`${miloLibs}/utils/utils.js`);
  loadStyle(`${miloLibs}/blocks/figure/figure.css`);

  if (window.location.pathname.includes('/topics/')) return topicHeader(createTag);
  if (window.location.pathname.includes('/authors/')) return;

  imgEls.forEach((imgEl) => {
    const block = createTag('div', { class: 'figure' });
    const row = createTag('div');
    const caption = getImageCaption(imgEl);
    const parentEl = imgEl.closest('p');

    if (caption) {
      const picture = createTag('p', null, imgEl.cloneNode(true));
      const em = createTag('p', null, caption.cloneNode(true));
      const wrapper = createTag('div');
      wrapper.append(picture, em);
      row.append(wrapper);
      caption.remove();
    } else {
      const wrapper = createTag('div', null, imgEl.cloneNode(true));
      row.append(wrapper);
    }

    block.append(row.cloneNode(true));
    parentEl.replaceWith(block);
  });
}

/**
 * Builds a block DOM Element from a two dimensional array
 * @param {string} blockName name of the block
 * @param {any} content two dimensional array or string or object of content
 */
function buildBlock(blockName, content) {
  const table = Array.isArray(content) ? content : [[content]];
  const blockEl = document.createElement('div');
  // build image block nested div structure
  blockEl.classList.add(blockName);
  table.forEach((row) => {
    const rowEl = document.createElement('div');
    row.forEach((col) => {
      const colEl = document.createElement('div');
      const vals = col.elems ? col.elems : [col];
      vals.forEach((val) => {
        if (val) {
          if (typeof val === 'string') {
            colEl.innerHTML += val;
          } else {
            colEl.appendChild(val);
          }
        }
      });
      rowEl.appendChild(colEl);
    });
    blockEl.appendChild(rowEl);
  });
  return (blockEl);
}

function getAuthorName(id) {
  // TODO might not work for all names, the name should
  // ideally come from query-index.json. Or define a
  // clean bidirectional name to path mapping
  return id.replace('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function buildTopicPage(mainEl) {
  const topic = window.location.pathname.match(/en\/topics\/(.*)/)[1];
  document.querySelectorAll('body *').forEach(e => {
    if(e.childElementCount == 0) {
      e.textContent = e.textContent.replace(/\$TOPIC\$/, topic);
    }
  })
  const title = `Topic: ${topic}`;
  const h1 = document.createElement('h1');
  h1.textContent = title;
  mainEl.prepend(h1);
  document.title = title;
}

function buildAuthorPage(mainEl) {

  // Replace author markers in the generic page
  // If we get a specific page it should be built with the
  // correct template to get the author's bio and feed
  const authorId = window.location.pathname.match(/en\/authors\/(.*)/)[1];
  const authorName = getAuthorName(authorId);
  document.title = authorName;
  document.querySelectorAll('body *').forEach(e => {
    if(e.childElementCount == 0) {
      e.textContent = e.textContent.replace(/\$AUTHOR\$/, authorName);
    }
  })

  // Make sure heading is H1
  const div = mainEl.querySelector('div');
  const heading = div.querySelector('h1, h2');
  if (heading.tagName !== 'H1') {
    title = document.createElement('h1');
    title.textContent = heading.textContent;
    title.id = heading.id;
    heading.replaceWith(title);
  }

  const bio = document.createElement('p');
  bio.textContent = ''; // TODO optionally get bio from author page
  const pic = createOptimizedPicture(`/images/authors/${authorId}.png`, authorName);
  const ppic = document.createElement('p');
  ppic.append(pic);
  const authorHeader = buildBlock('author-header', [
    [{
      elems: [
        heading,
        ppic,
        bio
      ],
    }],
  ]);
  div.prepend(authorHeader);
}

async function buildArticleHeader(el) {
  const miloLibs = getLibs();
  const { getMetadata, getConfig } = await import(`${miloLibs}/utils/utils.js`);
  const { loadTaxonomy, getLinkForTopic, getTaxonomyModule } = await import(`${miloLibs}/blocks/article-feed/article-helpers.js`);
  if (!getTaxonomyModule()) {
    await loadTaxonomy();
  }
  const div = document.createElement('div');
  // div.setAttribute('class', 'section');
  const h1 = el.querySelector('h1');
  const picture = el.querySelector('a[href*=".mp4"], picture');
  const caption = getImageCaption(picture);
  const figure = document.createElement('div');
  figure.append(picture, caption);
  const tag = getMetadata('article:tag');
  const category = tag || 'News';
  const author = getMetadata('author') || SITE.team;
  const { codeRoot } = getConfig();
  const authorURL = getMetadata('author-url') || (author ? `${codeRoot}${SITE.authorsRoot}/${author.replace(/[^0-9a-z]/gi, '-').toLowerCase()}` : null);
  const publicationDate = getMetadata('publication-date');

  const categoryTag = getLinkForTopic(category);

  const articleHeaderBlockEl = buildBlock('article-header', [
    [`<p>${categoryTag}</p>`],
    [h1],
    [`<p>${authorURL ? `<a href="${authorURL}">${author}</a>` : author}</p>
      <p>${publicationDate}</p>`],
    [figure],
  ]);
  div.append(articleHeaderBlockEl);
  el.prepend(div);
}

function buildTagsBlock() {
  const tagsArray = [...document.head.querySelectorAll('meta[property="article:tag"]')].map((el) => el.content) || [];
  const tagsBlock = buildBlock('tags', tagsArray.join(', '));
  document.querySelector('main')?.lastElementChild.append(tagsBlock);
}

function fixImportedContent() {
  // Fix m_date from imported Medium content, which is like
  // <meta name="m_date" content="2021-08-03">
  const date = document.head.querySelector('meta[name=m_date]');
  if(date) {    
    date.setAttribute('name','publication-date');
    // TODO does Milo use the locale, or a fixed format??
    const parts = date.content.split('-');
    date.content = `${parts[1]}-${parts[2]}-${parts[0]}`;
  }
}

// Gists are not separated as blocks in the original content, need
// to process them inline
function processGists(main) {
  main.querySelectorAll('a[href^="https://gist.github.com/"]').forEach(a => {
    const ig = document.createElement('inline-gist');
    ig.setAttribute('href', a.href);
    a.replaceWith(ig);
  })
}

export async function loadCSSURL(href) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`head > link[href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = reject;
      document.head.append(link);
    } else {
      resolve();
    }
  });
}

function addLangRoot() {
  // needed for category link in article header
  const meta = document.createElement('meta');
  meta.name = 'lang-root';
  meta.content = '/en';
  document.head.append(meta);
}

export async function buildDevblogAutoBlocks() {
  fixImportedContent();
  addLangRoot();
  setupTaxonomyProxy();
  const mainEl = document.querySelector('main');
  if(window.location.pathname.match(/\/authors\//)) {
    buildAuthorPage(mainEl);
  } else if(window.location.pathname.match(/\/topics\//)) {
    buildTopicPage(mainEl);
  } else if(window.location.pathname === '/') {
    // homepage
  } else {
    // article page
    await buildArticleHeader(mainEl);
    buildTagsBlock();
    processGists(mainEl);
  }
  loadWebComponents();
  setupDefaultImages();
}


