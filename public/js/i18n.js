let currentLanguage = localStorage.getItem('language') || 'en';
let translations = {};

async function loadLanguage(lang) {
  try {
    const response = await fetch(`/lang/${lang}.json`);
    translations = await response.json();
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    applyTranslations();
  } catch (error) {
    console.error('Error loading language:', error);
  }
}

function applyTranslations() {
  // Handle title tag specially
  const titleElement = document.querySelector('title[data-translate]');
  if (titleElement) {
    const key = titleElement.getAttribute('data-translate');
    if (translations[key]) {
      document.title = translations[key];
    }
  }
  
  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    if (translations[key]) {
      // Special case for cart link to preserve the icon
      if (key === 'cart') {
        // Find the text node after the icon
        const icon = element.querySelector('i');
        if (icon) {
          // Remove existing text nodes
          let nextSibling = icon.nextSibling;
          while (nextSibling) {
            if (nextSibling.nodeType === 3) { // Text node
              element.removeChild(nextSibling);
              nextSibling = icon.nextSibling;
            } else {
              break;
            }
          }
        }
      } else {
        element.textContent = translations[key];
      }
    }
  });

  document.querySelectorAll('[data-translate]').forEach(element => {
    const key = element.getAttribute('data-translate');
    if (translations[key] && element.tagName === 'INPUT' && element.type === 'text') {
      element.placeholder = translations[key];
    }
  });

  document.documentElement.lang = currentLanguage;
}

function t(key) {
  return translations[key] || key;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadLanguage(currentLanguage);

  // Set language selector
  const languageSelect = document.getElementById('language-select');
  if (languageSelect) {
    languageSelect.value = currentLanguage;
    languageSelect.addEventListener('change', (e) => {
      loadLanguage(e.target.value);
    });
  }
  
  // Update current language display
  const currentLangSpan = document.getElementById('current-lang');
  if (currentLangSpan) {
    currentLangSpan.textContent = currentLanguage.toUpperCase();
  }
});

// Global function for language dropdown
window.changeLanguage = async function(lang) {
  await loadLanguage(lang);
  const currentLangSpan = document.getElementById('current-lang');
  if (currentLangSpan) {
    currentLangSpan.textContent = lang.toUpperCase();
  }
};

// Switch language while staying on the same page (with ID if applicable)
window.switchLanguage = async function(lang) {
  // Set language in localStorage BEFORE navigating
  localStorage.setItem('language', lang);
  
  const currentPath = window.location.pathname;
  const pathParts = currentPath.split('/').filter(part => part !== '');
  let newPath = '';
  
  // Check if we're on a page with an ID (like /product/1 or /el/product/1)
  const isEnglishPage = pathParts[0] === 'product';
  const isGreekPage = pathParts[0] === 'el' && pathParts[1] === 'product';
  
  if (isEnglishPage && pathParts.length >= 2) {
    // /product/1 -> /el/product/1
    newPath = `/el/product/${pathParts[1]}`;
  } else if (isGreekPage && pathParts.length >= 3) {
    // /el/product/1 -> /product/1
    newPath = `/product/${pathParts[2]}`;
  } else if (pathParts[0] === 'products') {
    // /products -> /el/products
    newPath = lang === 'el' ? '/el/products' : '/products';
  } else if (pathParts[0] === 'el' && pathParts[1] === 'products') {
    // /el/products -> /products
    newPath = '/products';
  } else {
    // Default: just switch root path
    newPath = lang === 'el' ? '/el' : '/';
  }
  
  window.location.href = newPath;
};
