# Secure Asset Block

## Feature Overview: 

In standard image transformation from <a> tags to <picture> tags in EDS through [external sources](https://github.com/hlxsites/franklin-assets-selector/blob/ext-images/EXTERNAL_IMAGES.md), the presence of secure assets coming from DM with OpenAPI on the page isn't considered, treating all assets as if they are public. This block addresses that gap by embedding a delivery token while rendering secure assets.

## Advantages: 

This block allows content authors to embed secure assets directly into their EDS pages. It can also be extended to facilitate campaigns like member-exclusive deals by using placeholder images to prompt unauthorized users to become members.

## Functionality: 

The block reduces overhead by filtering secure assets using HEAD requests into a local map before making reload calls to DM OpenAPI. When a user provides a valid role or principal, secured images are refreshed accordingly, while public images remain unaffected.

## Usages

### Section Metadata Semantics

* `Placeholder Image` : Set any public image reference or base64 encoded image.

## Knowledge Base

### How the asset are identifed as secure?

It checks for 404 response status code with the help of HEAD HTTP request to identify any secure asset in DM with OpenAPI.

### How to maintain a page score of ~100 on LHS with secure assets on the page?

Identifying an asset as secure involves two requests within the block. The first, a HEAD request, determines if the asset is secure, followed by a request to render the secure asset's binary. This process can cause delays in LCP (Largest Contentful Paint), especially when numerous secure assets are present. To mitigate this, use the 'secure asset' block judiciously and only for specific use cases.

### How to update the fallback image?

Just update the section metadata with property - `Placeholder Image` with desired value

### How does a content author get the URL of a secure asset?

Author can select the target asset through Asset picker.

### How is the asset actually marked ‘secure’ on AEM author?

Can be set using asset property page followed by editing roles (aka dam:roles)

### How to refresh images via passing auth token for secure assets

The secure asset block listens to `auth-token-available` event to get the authentication token needed to fetch the secure images. A sample event with token valid till 10/27/2025 is illustrated below :
```
const customEvent = new CustomEvent('auth-token-available', { detail: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlcyI6ImFkbWluIiwiZXhwaXJ5IjoiMjAyNS0xMC0yOFQwMjozMzoyNC42NjhaIn0.El7r66ngrDXneNJWkLsLFQRESk-e4bhvDFHSoUJNo0k' });

document.dispatchEvent(customEvent);
```