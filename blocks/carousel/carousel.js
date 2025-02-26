import { fetchPlaceholders } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';


export function startInterval(block) {
  if (block.dataset.intervalTime > 0) {
    block.dataset.intervalId = setInterval(() => {
      // get number of slides
      const slides = block.querySelectorAll('.carousel-slide').length;
      // get next active slide
      block.dataset.activeSlide = (parseInt(block.dataset.activeSlide, 10) + 1) % slides;
      // show it
      showSlide(block, block.dataset.activeSlide);
    }, block.dataset.intervalTime);
  }
}

export function stopInterval(block) {
  if (block.dataset.intervalId) {
    clearInterval(block.dataset.intervalId);
    delete block.dataset.intervalId;
  }
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

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
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
  if(block.dataset.intervalId) {
    block.querySelectorAll('.carousel-slide-indicator > button').forEach((ind, index) => {
      if (index != slideIndex) {
        // for inactive indicators remove transition and set width to 0%
        ind.style.width = '0%';
        ind.style.transition = "none";
      } else {
        // for active indicators set transition and set width
        ind.style.width = '100%';
        ind.style.transition = `width ${block.dataset.intervalTime}ms linear`;
      }
    });
  }
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

  slideIndicators.querySelectorAll('li').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) - 1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    showSlide(block, parseInt(block.dataset.activeSlide, 10) + 1);
  });

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

  // on hover stop interval
  block.addEventListener('mouseenter', (e) => {
    // stop interval and set all indicators to 0%
    stopInterval(block);
    block.querySelectorAll('.carousel-slide-indicator > button').forEach((ind) => {
      ind.style.width = '0%';
      ind.style.transition = "none";
    });
  });

  block.addEventListener('mouseleave', (e) => {
    // restart interval for active indicator 
    let activeInd = block.querySelector('.carousel-slide-indicator > button[disabled^=true]');
    if (activeInd) {
      activeInd.style.width = '100%';
      activeInd.style.transition = `width ${block.dataset.intervalTime}ms linear`;
    }
    startInterval(block);
  });

  // set transition time in CSS
  block.style.setProperty('--transition-time', `${block.dataset.intervalTime}ms`);
  startInterval(block);
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
  let intervalTime = block.querySelector(":scope > div:first-child");
  block.dataset.intervalTime = parseInt(intervalTime.textContent,10);
  intervalTime.remove();

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
