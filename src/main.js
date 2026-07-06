import './style.css';
import projects from './data/projects.json';

const translations = {
  en: {
    mainTitle: "Photography Portfolio",
    noPhotos: "No photos found in this category.",
    photoAlt: "Photo from project",
    aboutTitle: "About Me",
    aboutText: "Professional photographer based in Canada, specializing in premium headshots, conceptual art, and lifestyle storytelling.",
    contactTitle: "Book a Session",
    contactText: "Let's discuss your next project or photo session concept.",
    catHeadshots: "Headshots",
    catArt: "Art",
    catLifestyle: "Lifestyle"
  },
  uk: {
    mainTitle: "Портфоліо Фотографа",
    noPhotos: "У цій категорії поки немає фотографій.",
    photoAlt: "Фото з проекту",
    aboutTitle: "Про мене",
    aboutText: "Професійний фотограф у Канаді, що спеціалізується на преміальних портретах (headshots), концептуальному арті та лайфстайл зйомках.",
    contactTitle: "Забронювати зйомку",
    contactText: "Обговорімо ваш наступний проект або концепцію фотосесії.",
    catHeadshots: "Портрети",
    catArt: "Арт",
    catLifestyle: "Лайфстайл"
  }
};

let currentLang = localStorage.getItem('site-lang') || 'en';

let initialCategory = 'Headshots';
if (projects && projects.length > 0 && projects[0].category) {
  initialCategory = projects[0].category;
}

let storedCategory = localStorage.getItem('site-category');
if (!storedCategory || storedCategory === 'undefined' || storedCategory === 'null') {
  storedCategory = initialCategory;
  localStorage.setItem('site-category', storedCategory);
}

let currentCategory = storedCategory;

function translateInterface() {
  document.documentElement.lang = currentLang;
  
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[currentLang][key]) {
      element.textContent = translations[currentLang][key];
    }
  });
}

function initActiveCategoryUI() {
  const buttons = document.querySelectorAll('.filter-btn');
  if (buttons.length === 0) return;

  let matchFound = false;
  buttons.forEach(btn => {
    const btnCat = btn.getAttribute('data-category');
    if (btnCat && btnCat.toLowerCase() === currentCategory.toLowerCase()) {
      btn.classList.add('active');
      matchFound = true;
    } else {
      btn.classList.remove('active');
    }
  });

  if (!matchFound && buttons[0]) {
    buttons[0].classList.add('active');
    currentCategory = buttons[0].getAttribute('data-category') || 'Headshots';
    localStorage.setItem('site-category', currentCategory);
  }
}

function renderGallery() {
  const galleryRoot = document.getElementById('gallery-root');
  if (!galleryRoot) return;
  
  const filteredProjects = projects.filter(
    p => p.category && p.category.toLowerCase() === currentCategory.toLowerCase()
  );

  const allImages = filteredProjects.flatMap(project => 
    project.images.map(imgUrl => ({
      url: imgUrl,
      alt: project.title[currentLang] || project.title['en']
    }))
  );

  if (allImages.length === 0 && projects.length > 0 && projects[0].category) {
    currentCategory = projects[0].category;
    localStorage.setItem('site-category', currentCategory);
    initActiveCategoryUI();
    renderGallery();
    return;
  }

  if (allImages.length === 0) {
    galleryRoot.innerHTML = `<p class="no-photos">${translations[currentLang].noPhotos}</p>`;
    return;
  }

  galleryRoot.innerHTML = allImages.map(img => `
    <figure class="grid-item">
      <img src="${img.url}" alt="${img.alt}" loading="lazy" decoding="async">
    </figure>
  `).join('');
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  if (btn.getAttribute('data-lang') === currentLang) btn.classList.add('active');
  else btn.classList.remove('active');

  btn.addEventListener('click', (e) => {
    currentLang = e.target.getAttribute('data-lang');
    localStorage.setItem('site-lang', currentLang);
    
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    translateInterface();
    renderGallery();
  });
});

document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    currentCategory = e.target.getAttribute('data-category');
    localStorage.setItem('site-category', currentCategory);
    
    renderGallery();
  });
});

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.lightbox-close');
const prevBtn = document.querySelector('.lightbox-nav.prev');
const nextBtn = document.querySelector('.lightbox-nav.next');

let currentIndex = 0;
let currentPhotosList = [];

const galleryContainer = document.getElementById('gallery-root');
if (galleryContainer) {
  galleryContainer.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
      const allRenderedImgs = Array.from(document.querySelectorAll('#gallery-root img'));
      currentPhotosList = allRenderedImgs.map(img => ({ src: img.src, alt: img.alt }));
      currentIndex = allRenderedImgs.indexOf(e.target);
      showLightbox();
    }
  });
}

function showLightbox() {
  if (!lightboxImg || !lightbox) return;
  const photo = currentPhotosList[currentIndex];
  if (!photo) return;
  
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.alt;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (lightbox) lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function nextPhoto() {
  if (currentPhotosList.length === 0) return;
  currentIndex = (currentIndex + 1) % currentPhotosList.length;
  showLightbox();
}

function prevPhoto() {
  if (currentPhotosList.length === 0) return;
  currentIndex = (currentIndex - 1 + currentPhotosList.length) % currentPhotosList.length;
  showLightbox();
}

if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
if (nextBtn) nextBtn.addEventListener('click', nextPhoto);
if (prevBtn) prevBtn.addEventListener('click', prevPhoto);

if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

window.addEventListener('keydown', (e) => {
  if (!lightbox || !lightbox.classList.contains('active')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') nextPhoto();
  if (e.key === 'ArrowLeft') prevPhoto();
});

translateInterface();
initActiveCategoryUI();
renderGallery();

