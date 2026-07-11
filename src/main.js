import './style.css';
import staticProjects from './data/projects.json';

const translations = {
  en: {
    mainTitle: "AndyMark Photography",
    noPhotos: "No photos found in this category.",
    photoAlt: "Photo from project",
    aboutTitle: "About Me",
    callMe: "Call me",
    aboutText: "Professional photographer based in Canada, specializing in premium headshots, conceptual art, and lifestyle storytelling.",
    contactTitle: "Book a Session",
    contactText: "Let's discuss your next project or photo session concept.",
    catHeadshots: "Headshots",
    catArt: "Art",
    catLifestyle: "Lifestyle",
    catTheatre: "Theatre",
    catNature: "Nature"
  },
  uk: {
    mainTitle: "АндіМарк Фотограф",
    noPhotos: "У цій категорії поки немає фотографій.",
    photoAlt: "Фото з проекту",
    aboutTitle: "Про мене",
    callMe: "Дзвоніть мені",
    aboutText: "Професійний фотограф у Канаді, що спеціалізується на преміальних портретах (headshots), концептуальному арті та лайфстайл зйомках.",
    contactTitle: "Забронювати зйомку",
    contactText: "Обговорімо ваш наступний проект або концепцію фотосесії.",
    catHeadshots: "Портрети",
    catArt: "Арт",
    catLifestyle: "Лайфстайл",
    catTheatre: "Театр",
    catNature: "Природа"
  },
  fr: {
    mainTitle: "AndyMark Photographie",
    noPhotos: "Aucune photo trouvée dans cette catégorie.",
    photoAlt: "Photo du projet",
    aboutTitle: "À Propos de Moi",
    callMe: "Appelez-moi",
    aboutText: "Photographe professionnel basé au Canada, spécialisé dans les portraits haut de gamme, l'art conceptuel et le storytelling lifestyle.",
    contactTitle: "Réserver une Session",
    contactText: "Discutons de votre prochain projet ou concept de séance photo.",
    catHeadshots: "Portraits",
    catArt: "Art",
    catLifestyle: "Lifestyle",
    catTheatre: "Théâtre",
    catNature: "Nature"
  }
};

let currentLang = localStorage.getItem('site-lang') || 'en';
let currentCategory = localStorage.getItem('site-category') || 'Headshots';

// Directly seed memory with build-time static registry to prevent layout empty states on production
let projectsDataMemory = staticProjects || []; 

// Safely pull latest dataset from filesystem using runtime fallback checks
async function fetchProjectsRegistry() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (isLocal) {
    try {
      // Direct call via Vite config proxy. If Admin panel is active, returns fresh file states instantly.
      const res = await fetch(`/photo/api/live-data?t=${Date.now()}`);
      if (res.ok) {
        projectsDataMemory = await res.json();
        return;
      }
    } catch (err) {
      // In case local admin is turned off, catch pipeline silently drops to standard static imports
    }
  }
  
  // Standard Production compile-time fallback execution mapping (GitHub Pages execution context)
  projectsDataMemory = staticProjects || [];
}

// Helper function to evaluate valid categories dynamically from the current state of projects
function getLiveCategories() {
  const dynamicCategories = Array.from(
    new Set(
      projectsDataMemory
        .filter(p => p.category && p.category !== 'Uncategorized' && p.images && p.images.length > 0)
        .map(p => p.category)
    )
  );
  return dynamicCategories;
}

function translateInterface() {
  document.documentElement.lang = currentLang;
  
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[currentLang][key]) {
      element.textContent = translations[currentLang][key];
    }
  });

  renderCategoryNav();
}

function renderCategoryNav() {
  const navRoot = document.getElementById('filter-nav-root');
  if (!navRoot) return;

  const liveCategories = getLiveCategories();

  if (liveCategories.length === 0) {
    navRoot.innerHTML = '';
    return;
  }

  // If the active category completely disappeared due to admin changes, safely re-route pointers
  if (!liveCategories.includes(currentCategory)) {
    currentCategory = liveCategories[0];
    localStorage.setItem('site-category', currentCategory);
  }

  navRoot.innerHTML = liveCategories.map(cat => {
    const i18nKey = `cat${cat}`;
    const label = translations[currentLang][i18nKey] || cat;
    const activeClass = cat.toLowerCase() === currentCategory.toLowerCase() ? 'active' : '';
    return `<button class="filter-btn ${activeClass}" data-category="${cat}">${label}</button>`;
  }).join('');

  // Explicit target binding cleanup to prevent execution locks
  navRoot.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      navRoot.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');

      currentCategory = e.target.getAttribute('data-category');
      localStorage.setItem('site-category', currentCategory);
      
      renderGallery();
    });
  });
}

function renderGallery() {
  const galleryRoot = document.getElementById('gallery-root');
  if (!galleryRoot) return;
  
  if (projectsDataMemory.length === 0) {
    galleryRoot.innerHTML = `<p class="no-photos">${translations[currentLang].noPhotos}</p>`;
    return;
  }

  const filteredProjects = projectsDataMemory.filter(
    p => p.category && p.category.toLowerCase() === currentCategory.toLowerCase()
  );

  const allImages = filteredProjects.flatMap(project => 
    (project.images || []).map(imgObj => ({
      // Prepend repository base path on production environments to match build outDir delivery mapping
      url: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? imgObj.url 
        : `/photo/${imgObj.url}`,
      alt: imgObj.alt ? (imgObj.alt[currentLang] || imgObj.alt['en']) : translations[currentLang].photoAlt
    }))
  );

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

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const closeBtn = document.querySelector('.lightbox-close');
const prevBtn = document.querySelector('.lightbox-nav.prev');
const nextBtn = document.querySelector('.lightbox-nav.next');

let currentIndex = 0;
let currentPhotosList = [];

document.body.addEventListener('click', (e) => {
  if (e.target.matches('#gallery-root img')) {
    const allRenderedImgs = Array.from(document.querySelectorAll('#gallery-root img'));
    currentPhotosList = allRenderedImgs.map(img => ({ src: img.src, alt: img.alt }));
    currentIndex = allRenderedImgs.indexOf(e.target);
    showLightbox();
  }
});

function showLightbox() {
  if (!lightboxImg || !lightbox) return;
  const photo = currentPhotosList[currentIndex];
  if (!photo) return;
  
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.alt;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

if (lightboxImg) {
  lightboxImg.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (lightbox.requestFullscreen) {
        lightbox.requestFullscreen().catch(() => {});
      } else if (lightbox.webkitRequestFullscreen) {
        lightbox.webkitRequestFullscreen();
      }
    } else {
      exitMonitorFullscreen();
    }
  });
}

function exitMonitorFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function closeLightbox() {
  exitMonitorFullscreen();
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
if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextPhoto(); });
if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevPhoto(); });

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

// App core bootstrapper sequencing pipeline orchestration
async function bootSystem() {
  await fetchProjectsRegistry();
  translateInterface();
  renderGallery();
}

// Automatically sync UI graphics state when focus shifts back to the portfolio app view context
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    await fetchProjectsRegistry();
    renderCategoryNav();
    renderGallery();
  }
});

bootSystem();
