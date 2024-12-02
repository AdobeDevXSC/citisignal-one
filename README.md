:construction: This is an early access technology and is still heavily in development. Reach out to us over Slack / Discord before using it.

# AEM Edge Delivery Services Assets Plugin
The AEM Assets Plugin helps you quickly integrate with AEM Assets for your AEM project. It is currently available to customers in collaboration with AEM Engineering via co-innovation VIP Projects. To implement your use cases, please reach out to the AEM Engineering team in the Slack channel dedicated to your project.

## Features
- A collection of blocks to use AEM Assets in Edge Delivery Services based websites
- Utility functions to generate markup for delivering assets from AEM Assets

## Prerequisites
- You need to have an AEM Assets as a Cloud Service subscription
- You need to have access to [Dynamic Media Open API](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/assets/dynamicmedia/dynamic-media-open-apis/dynamic-media-open-apis-overview)

And you need to have pre-configured:
- [AEM Assets Sidekick plugin](https://www.aem.live/docs/aem-assets-sidekick-plugin) if using Doc based authoring OR
- [Universal Editor Custom Asset Picker](https://developer.adobe.com/uix/docs/extension-manager/extension-developed-by-adobe/configurable-asset-picker/) if using Universal Editor based authoring

## Installation

Add the plugin to your AEM project by running:
```sh
git subtree add --squash --prefix plugins/aem-assets-plugin git@github.com:adobe-rnd/aem-assets-plugin.git main
```

If you later want to pull the latest changes and update your local copy of the plugin
```sh
git subtree pull --squash --prefix plugins/aem-assets-plugin git@github.com:adobe-rnd/aem-assets-plugin.git main
```

If you prefer using `https` links you'd replace `git@github.com:adobe-rnd/aem-assets-plugin.git` in the above commands by `https://github.com:adobe-rnd/aem-assets-plugin.git`.

If the `subtree pull` command is failing with an error like:
```
fatal: can't squash-merge: 'plugins/aem-assets-plugin' was never added
```
you can just delete the folder and re-add the plugin via the `git subtree add` command above.

## Project instrumentation

To properly connect and configure the plugin for your project, you'll need to edit both the `aem.js` and `scripts.js` in your AEM project and add a new file `aem-assets-plugin-support.js` in the `scripts` folder.

> **Note:** All the changes described below can also be seen consolidated in this [git commit](https://github.com/hlxsites/franklin-assets-selector/commit/f512e9b10d752971136fef476402826b61d07f45).


Here's typically how `scripts/aem-assets-plugin-support.js` would look:

```
// The based path of the aem-assets-plugin code.
const codeBasePath = `${window.hlx?.codeBasePath}/plugins/aem-assets-plugin`;

// The blocks that are to be used from the aem-assets-plugin.
const blocks = ['video'];

// Initialize the aem-assets-plugin.
export default async function assetsInit() {
  const { loadBlock, createOptimizedPicture } = await import(`${codeBasePath}/scripts/aem-assets.js`);
  window.hlx = window.hlx || {};
  window.hlx.aemassets = {
    codeBasePath,
    blocks,
    loadBlock,
    createOptimizedPicture,
  };
}
```

You'd need to add the following code in `createOptimizedPicture` in `aem.js` to call the overidden version of this function
```
  if (window.hlx?.aemassets?.createOptimizedPicture) {
    return window.hlx.aemassets.createOptimizedPicture(src, alt, eager, breakpoints);
  }
```

Here's the complete code for `createOptimizedPicture` in `aem.js` with the above lines of code added
```
function createOptimizedPicture(
  src,
  alt = '',
  eager = false,
  breakpoints = [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }],
) {

  // Add below lines of code //
  if (window.hlx?.aemassets?.createOptimizedPicture) {
    return window.hlx.aemassets.createOptimizedPicture(src, alt, eager, breakpoints);
  }
  // Add above lines of code //

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
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', alt);
      picture.appendChild(img);
      img.setAttribute('src', `${pathname}?width=${br.width}&format=${ext}&optimize=medium`);
    }
  });

  return picture;
}
```

You'd need to add the following code in `loadBlock` in `aem.js` to call the overidden version of this function
```
  if (window.hlx?.aemassets?.loadBlock) {
    return window.hlx.aemassets.loadBlock(block);
  }
```

Here's the complete code for `loadBlock` in `aem.js` with the above lines of code added
```
async function loadBlock(block) {

  // Add below lines of code //
  if (window.hlx?.aemassets?.loadBlock) {
    return window.hlx.aemassets.loadBlock(block);
  }
  // Add above lines of code //

  const status = block.dataset.blockStatus;
  if (status !== 'loading' && status !== 'loaded') {
    block.dataset.blockStatus = 'loading';
    const { blockName } = block.dataset;
    try {
      const cssLoaded = loadCSS(`${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.css`);
      const decorationComplete = new Promise((resolve) => {
        (async () => {
          try {
            const mod = await import(
              `${window.hlx.codeBasePath}/blocks/${blockName}/${blockName}.js`
            );
            if (mod.default) {
              await mod.default(block);
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.log(`failed to load module for ${blockName}`, error);
          }
          resolve();
        })();
      });
      await Promise.all([cssLoaded, decorationComplete]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`failed to load block ${blockName}`, error);
    }
    block.dataset.blockStatus = 'loaded';
  }
  return block;
}
```

In `scripts/scripts.js` you'd need to add the following lines of code:

Import `aem-assets-plugin-support.js`
```
import assetsInit from './aem-assets-plugin-support.js';
```

Initialize `aem-assets-plugin-support.js`
```
await assetsInit(); // This to be done before loadPage() function invocation
loadPage();
```

## FAQ

Q. Why should I use this plugin?

A. The plugin provides a quick way to start using AEM Assets in your website. It abstracts and implements the groundwork to be able to consume AEM Assets delivery URLs in your wbsite, thus helps avoiding additional work to implement everything from scratch. This plugin also has a collection of standard blocks to consume AEM Assets which can be reused as they are, or copied over in your website for adaptations.
