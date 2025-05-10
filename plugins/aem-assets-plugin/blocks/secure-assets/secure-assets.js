const securedImages = [];
let placeholderImg;

/**
 * to check if given src is a DM OpenAPI URL
 */
function isDMOpenAPIUrl(src) {
  return /^(https?:\/\/(.*)\/adobe\/assets\/urn:aaid:aem:(.*))/gm.test(src);
}

/**
 * to check if given src is a secure asset
 */
async function isSecureAsset(src) {
  let isSecure = false;
  try {
    const response = await fetch(src, { method: 'HEAD' });
    if (response.ok) {
      isSecure = false;
    } else if (response.status === 404) {
      // 404 is thrown by DM OpenAPI if the asset is secure
      isSecure = true;
    }
  } catch {
    isSecure = false;
  }
  return isSecure;
}

/**
 * Replace the image with placeholder image in case of error
 */
function handleImageError(img) {
  img.src = placeholderImg;
  img.closest('picture').querySelectorAll('source').forEach((source) => {
    source.srcset = placeholderImg;
  });
}

/**
 * Try to restore the original image using the token
 * and fallback to placeholder image in case of error
 */
function restoreOriginalImage(img, token) {
  fetch(img.getAttribute('data-original-src'), {
    headers: {
      'x-asset-delivery-token': token,
    },
  }).then(async (resp) => {
    if (resp.status === 200) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        img.setAttribute('src', base64Data);
        img.closest('picture').querySelectorAll('source').forEach((el) => {
          el.setAttribute('srcset', base64Data);
        });
      };
      reader.readAsDataURL(await resp.blob());
    } else {
      handleImageError(img);
    }
  });
}

/**
 * checking if the JWT token is valid
 */
function isJWTTokenValid(token) {
  let isValid = false;
  try {
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(atob(payload));
    if (!decodedPayload.exp) {
      isValid = (new Date(decodedPayload.expiry).getTime()) > Date.now();
    } else {
      isValid = decodedPayload.exp > (Date.now() / 1000);
    }
  } catch {
    isValid = false;
  }
  return isValid;
}

export default function decorate(block) {
  placeholderImg = document.querySelector('.secure-assets-container')?.getAttribute('data-placeholder-image');
  const images = block.querySelectorAll('img');
  const authToken = localStorage.getItem('auth-token');

  images.forEach(async (img) => {
    const src = img.getAttribute('src');
    if (!securedImages.includes(img) && isDMOpenAPIUrl(src) && await isSecureAsset(src)) {
      // Identify all secure images and push them into securedImages map
      securedImages.push(img);

      // capture the original src and replace the src with placeholder image
      img.setAttribute('data-original-src', src);
      if (authToken && isJWTTokenValid(authToken)) {
        // If auth token is already available in localStorage, restore the original image
        restoreOriginalImage(img, authToken);
      } else {
        img.src = placeholderImg;
        img.closest('picture').querySelectorAll('source').forEach((source) => {
          // capture the original src and replace the src with placeholder image
          source.setAttribute('data-original-src', source.srcset);
          source.srcset = placeholderImg;
        });
      }
    }
  });

  // Listen for auth-token-available event to restore the original images
  // Refer README.md for more details & examples
  document.addEventListener('auth-token-available', (event) => {
    const token = event.detail;
    localStorage.setItem('auth-token', token);
    securedImages.forEach((img) => {
      if (token && isJWTTokenValid(token)) {
        restoreOriginalImage(img, token);
      }
    });
  });
}
