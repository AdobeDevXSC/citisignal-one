/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */
// Drop-in Providers
import { render as cartProvider } from '@dropins/storefront-cart/render.js';

// Drop-in Containers
import MiniCart from '@dropins/storefront-cart/containers/MiniCart.js';

// Drop-in Tools
import { events } from '@dropins/tools/event-bus.js';
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop.matches) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('role', 'button');
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('role');
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }
  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

function addAnimation() {
  window.addEventListener('scroll', () => {
    const header = document.getElementsByClassName('header-nav-wrapper')[0];
    const scrollPosition = window.scrollY;
    const viewportWidth = window.innerWidth;

    if (viewportWidth > 900) {
      if (scrollPosition > 168) {
        header.classList.add('minimized');
      } else {
        header.classList.remove('minimized');
      }
    } else {
      header.classList.remove('minimized');
    }
  });
}

function setActiveTab() {
  const currentPath = window.location.pathname;
  const matchResult = currentPath.match(/^\/([^/]+)/);
  const path = matchResult ? matchResult[1] : null;
  const navTabLinks = document.querySelector('.nav-sections ul');

  [...navTabLinks.children].forEach((tab) => {
    const link = tab.querySelector('a');
    const linkTitle = link.title.toLowerCase();

    if (linkTitle === path || (linkTitle === 'shop' && ['products', 'equipment', 'search'].includes(path))) {
      link.classList.add('active');
    }
  });
}

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  /* eslint-disable-next-line no-console */
  console.log(`navMeta = ${navMeta}`);
  const navPath = navMeta || '/nav'; // navMeta ? new URL(navMeta).pathname : '/nav';
  //  const navPath = navMeta ? new URL(navMeta).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const brandLogo = nav.querySelector('img')
  if (brandLogo) {
    const container = brandLogo.closest('p');
    if (container) {
      const homeLink = document.createElement('a'); 
      homeLink.href = '/';
      homeLink.append(brandLogo.parentElement);
      container.nextElementSibling.remove();
      container.replaceWith(homeLink);
    }
  }
  
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  const navTools = nav.querySelector('.nav-tools');

  /** Mini Cart */
  const excludeMiniCartFromPaths = ['/checkout', '/order-confirmation'];

  const minicart = document.createRange().createContextualFragment(`
     <div class="minicart-wrapper">
       <button type="button" class="nav-cart-button" aria-label="Cart"></button>
       <div class="minicart-panel nav-panel"></div>
     </div>
   `);

  navTools.append(minicart);

  const minicartPanel = navTools.querySelector('.minicart-panel');
  const cartButton = navTools.querySelector('.nav-cart-button');

  if (excludeMiniCartFromPaths.includes(window.location.pathname)) {
    cartButton.style.display = 'none';
  }

  async function toggleMiniCart(state) {
    const show = state ?? !minicartPanel.classList.contains('nav-panel--show');

    if (show) {
      await cartProvider.render(MiniCart, {
        routeEmptyCartCTA: () => '/',
        routeProduct: (product) => `/products/${product.url.urlKey}/${product.sku}`,
        routeCart: () => '/cart',
        routeCheckout: () => '/checkout',
      })(minicartPanel);
    } else {
      cartProvider.unmount(minicartPanel);
    }

    minicartPanel.classList.toggle('nav-panel--show', show);
  }

  cartButton.addEventListener('click', () => toggleMiniCart());

  // Cart Item Counter
  events.on('cart/data', (data) => {
    if (data?.totalQuantity) {
      cartButton.setAttribute('data-count', data.totalQuantity);
    } else {
      cartButton.removeAttribute('data-count');
    }
  }, { eager: true });

  /** Search */
  const search = document.createRange().createContextualFragment(`
  <div class="search-wrapper">
    <button type="button" class="button nav-search-button">Search</button>
    <div class="nav-search-input nav-search-panel nav-panel hidden">
      <form id="search_mini_form" action="/search" method="GET">
        <input id="search" type="search" name="q" placeholder="Search" />
        <div id="search_autocomplete" class="search-autocomplete"></div>
      </form>
    </div>
  </div>
  `);

  navTools.append(search);

  const searchPanel = navTools.querySelector('.nav-search-panel');
  const searchButton = navTools.querySelector('.nav-search-button');
  const searchInput = searchPanel.querySelector('input');

  function toggleSearch(state) {
    const show = state ?? !searchPanel.classList.contains('nav-panel--show');
    searchPanel.classList.toggle('nav-panel--show', show);
    if (show) searchInput.focus();
  }

  navTools.querySelector('.nav-search-button').addEventListener('click', async () => {
    await import('./searchbar.js');
    document.querySelector('header .nav-search-input').classList.toggle('hidden');
    toggleSearch();
  });

  // Close panels when clicking outside
  document.addEventListener('click', (e) => {
    if (!minicartPanel.contains(e.target) && !cartButton.contains(e.target)) {
      toggleMiniCart(false);
    }

    if (!searchPanel.contains(e.target) && !searchButton.contains(e.target)) {
      toggleSearch(false);
    }
  });

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'header-nav-wrapper';
  navWrapper.append(nav);

  const topNav = navWrapper.querySelector('.nav-tools .default-content-wrapper');
  block.prepend(topNav);
  block.append(navWrapper);

  addAnimation();
  setActiveTab();
}
