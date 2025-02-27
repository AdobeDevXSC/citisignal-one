import { fetchPlaceholders } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export function timeout(block) {
  // if block is no longer in the document e.g. after a refresh/reload/edit, kick it.
  if(!document.documentElement.contains(block)) {
    // make sure to clear timeout
    clearTimeout(block.dataset.timeoutId);
    return;
  };
  // get number of slides
  const slides = block.querySelectorAll('.carousel-slide').length;
  // get next active 
   block.dataset.activeSlide = 
     block.dataset.activeSlide ? (parseInt(block.dataset.activeSlide, 10) + 1) % slides : 0;
  // show it
  showSlide(block, block.dataset.activeSlide);
  // start next waitng cycle
  block.dataset.timeoutIId = setTimeout(timeout,block.dataset.timeoutMs,block);
}

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  // start the next indicator animation
  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').classList.remove('animate');
    } else {
      indicator.querySelector('button').classList.add('animate');
    }
  });
}

/**
 *
 * @param {Element} block
 * @param {*} slideIndex
 */
export function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide.querySelectorAll('a').forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

/**
 *
 * @param {Element} block
 * @returns
 */
function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  // click on indicator buttons scrolls slide into view
  slideIndicators.querySelectorAll('li').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  // click on prev/next buttons scrolls slide into view
  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

  // observer to update active slide once it is in view
  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) updateActiveSlide(entry.target);
      });
    },
    { threshold: 0.5 },
  );
  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });

  // on mouseenter , cancel autoscroll
  block.addEventListener('mouseenter', (e) => {
    // remove indicator animation
    block.querySelector('.carousel-slide-indicator > button.animate')?.classList.remove('animate');
    // stop autoscrolling
    clearTimeout(block.dataset.timeoutIId);
  });

  // on mouseleave, restart autoscroll
  block.addEventListener('mouseleave', (e) => {
    // restart interval for active indicator 
    block.querySelector('.carousel-slide-indicator > button').forEach((indicator,idx) => {
      if (block.dataset.activeSlide == idx) {
        indicator.classList.add('animate');
      }
    });
    // restart autosrolling
    block.dataset.timeoutId = setTimeout(timeout, block.dataset.timeoutMs,block);
  });

  // start autoscrolling
  block.dataset.timeoutId = setTimeout(timeout, block.dataset.timeoutMs,block);
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

let carouselId = 0;
export default async function decorate(block) {
  // read interval time
  let timeoutMs = block.querySelector(":scope > div:first-child");
  // store info on the block
  block.dataset.timeoutMs = parseInt(timeoutMs.textContent,10);
  // set transition time also in CSS
  block.style.setProperty('--transition-time', `${block.dataset.timeoutMs}ms`);
  // remove the timeout time from the block
  timeoutMs.remove();

  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute(
      'aria-label',
      placeholders.carouselSlideControls || 'Carousel Slide Controls',
    );
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class= "slide-prev" aria-label="${
        placeholders.previousSlide || 'Previous Slide'
      }"></button>
      <button type="button" class="slide-next" aria-label="${
        placeholders.nextSlide || 'Next Slide'
      }"></button>
    `;

    container.append(slideNavButtons);
  }

  rows.forEach((row, idx) => {
    const classes = row
      .querySelector(':scope > div')
      ?.textContent?.split(',')
      ?.map((c) => c.trim());
    row.querySelector(':scope > div')?.remove();
    const slide = createSlide(row, idx, carouselId);
    if (classes && classes.length > 0) {
      slide.classList.add(...classes);
    }
    console.log(row.querySelector(':scope > div'));
    moveInstrumentation(row, slide);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button"><span>${
        placeholders.showSlide || 'Show Slide'
      } ${idx + 1} ${placeholders.of || 'of'} ${rows.length}</span></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
  }
}
