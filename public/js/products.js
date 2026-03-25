document.addEventListener('DOMContentLoaded', async () => {
  // Close all popups
  window.closeAllPopups = function() {
    document.getElementById('filter-popup').style.display = 'none';
    document.getElementById('sort-popup').style.display = 'none';
  };

  // Filter popup toggle
  window.toggleFilterPopup = function() {
    const filterPopup = document.getElementById('filter-popup');
    const sortPopup = document.getElementById('sort-popup');
    // Close sort popup if open
    sortPopup.style.display = 'none';
    // Toggle filter popup
    filterPopup.style.display = filterPopup.style.display === 'none' ? 'block' : 'none';
  };

  const filterToggle = document.getElementById('filter-toggle');
  const filterPopup = document.getElementById('filter-popup');
  const closeFilters = document.getElementById('close-filters');
  
  if (filterToggle && filterPopup) {
    filterToggle.addEventListener('click', () => {
      filterPopup.classList.add('show');
    });
    
    if (closeFilters) {
      closeFilters.addEventListener('click', () => {
        filterPopup.classList.remove('show');
      });
    }
    
    filterPopup.addEventListener('click', (e) => {
      if (e.target === filterPopup) {
        filterPopup.classList.remove('show');
      }
    });
  }

  let allProducts = [];
  let filteredProducts = [];
  let productRatings = {};

  // Load all products
  async function loadProducts() {
    try {
      const response = await fetch('/api/products');
      allProducts = await response.json();
      filteredProducts = [...allProducts];
      
      // Fetch ratings for all products
      await fetchAllRatings();
      displayProducts(filteredProducts);
      
      // Populate brand filter dropdown dynamically
      populateBrandFilter();
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  // Fetch ratings for all products
  async function fetchAllRatings() {
    for (const product of allProducts) {
      try {
        const response = await fetch(`/api/reviews/${product.id}/average`);
        const data = await response.json();
        productRatings[product.id] = data;
      } catch (error) {
        console.error('Error loading ratings:', error);
        productRatings[product.id] = { average: 0, count: 0 };
      }
    }
  }

  // Populate brand filter dropdown dynamically
  function populateBrandFilter() {
    const brandFilter = document.getElementById('brand-filter');
    if (!brandFilter) return;
    
    // Get unique brands from products
    const brands = [...new Set(allProducts.map(p => p.brand).filter(brand => brand))].sort();
    
    // Populate dropdown
    brandFilter.innerHTML = '<option value="">All Brands</option>' +
      brands.map(brand => `<option value="${brand}">${brand}</option>`).join('');
    
    // Add event listener for brand filter
    brandFilter.addEventListener('change', (e) => {
      const brand = e.target.value;
      const category = document.getElementById('category-filter').value;
      
      filteredProducts = allProducts.filter(p => {
        const brandMatch = brand ? p.brand === brand : true;
        const categoryMatch = category ? p.category === category : true;
        return brandMatch && categoryMatch;
      });
      
      displayProducts(filteredProducts);
      document.getElementById('filter-popup').style.display = 'none';
    });
  }

  // Generate stars HTML
  function getStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let starsHTML = '';
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        starsHTML += '<i class="fas fa-star" style="color: #f1ab13;"></i>';
      } else if (i === fullStars && hasHalfStar) {
        starsHTML += '<i class="fas fa-star-half-alt" style="color: #f1ab13;"></i>';
      } else {
        starsHTML += '<i class="far fa-star" style="color: #f1ab13;"></i>';
      }
    }
    return starsHTML;
  }

  // Display products
  function displayProducts(products) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = products.map(product => {
      const rating = productRatings[product.id] || { average: 0, count: 0 };
      const hasReviews = rating.count > 0;
      
      return `
        <div class="product-card" onclick="window.location.href='/${currentLanguage === 'el' ? 'el/' : ''}product/${product.id}'">
          <div class="product-image">
            <img src="/images/${product.image}" alt="${currentLanguage === 'en' ? product.name_en : product.name_el}" onerror="this.src='/images/default.jpg'">
          </div>
          <div class="product-info">
            <p class="brand">${product.brand}</p>
            <h3>${currentLanguage === 'en' ? product.name_en : product.name_el}</h3>
            <div class="price-row">
              <p class="price">€${product.price.toFixed(2)}</p>
              <button class="wishlist-btn" data-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist(${product.id})">
                <i class="far fa-heart"></i>
              </button>
              <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(${product.id})"><i class="fas fa-shopping-bag"></i></button>
            </div>
            <div class="rating-row">
              ${hasReviews ? 
                `<div class="stars">${getStarsHTML(rating.average)}</div>` :
                `<span style="color: gray; font-size: 12px;">${currentLanguage === 'en' ? 'No reviews yet' : 'Δεν υπάρχουν ακόμα κριτικές'}</span>`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Filter by category
  document.getElementById('category-filter').addEventListener('change', (e) => {
    const category = e.target.value;
    const brand = document.getElementById('brand-filter').value;
    
    filteredProducts = allProducts.filter(p => {
      const categoryMatch = category ? p.category === category : true;
      const brandMatch = brand ? p.brand === brand : true;
      return categoryMatch && brandMatch;
    });
    displayProducts(filteredProducts);
  });

  // Filter by search (top search box) with autocomplete
  document.getElementById('search-input-top').addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const autocomplete = document.getElementById('search-autocomplete');
    
    if (search.length > 0) {
      const matches = allProducts.filter(p => {
        const name = currentLanguage === 'en' ? p.name_en : p.name_el;
        return name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
      }).slice(0, 5);
      
      if (matches.length > 0) {
        autocomplete.innerHTML = matches.map(p => `
          <div class="autocomplete-item" onclick="window.location.href='/${currentLanguage === 'el' ? 'el/' : ''}product/${p.id}'" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
            <img src="/images/${p.image}" alt="${p.name_en}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 5px;" onerror="this.src='/images/default.jpg'">
            <div>
              <div style="font-weight: bold; font-size: 12px;">${currentLanguage === 'en' ? p.name_en : p.name_el}</div>
              <div style="color: #666; font-size: 12px;">${p.brand} - €${p.price.toFixed(2)}</div>
            </div>
          </div>
        `).join('');
        autocomplete.style.display = 'block';
      } else {
        autocomplete.style.display = 'none';
      }
    } else {
      autocomplete.style.display = 'none';
    }
    
    filteredProducts = allProducts.filter(p => {
      const name = currentLanguage === 'en' ? p.name_en : p.name_el;
      return name.toLowerCase().includes(search) || p.brand.toLowerCase().includes(search);
    });
    displayProducts(filteredProducts);
  });

  // Filter by category
  const categoryFilter = document.getElementById('category-filter');
  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      const category = e.target.value;
      const brand = document.getElementById('brand-filter').value;
      
      filteredProducts = allProducts.filter(p => {
        const categoryMatch = category ? p.category === category : true;
        const brandMatch = brand ? p.brand === brand : true;
        return categoryMatch && brandMatch;
      });
      displayProducts(filteredProducts);
      // Close popup after selection
      document.getElementById('filter-popup').style.display = 'none';
    });
  }

  // Toggle sort options popup
  window.toggleSortOptions = function() {
    const filterPopup = document.getElementById('filter-popup');
    const sortPopup = document.getElementById('sort-popup');
    // Close categories popup if open
    filterPopup.style.display = 'none';
    // Toggle sort popup
    sortPopup.style.display = sortPopup.style.display === 'none' ? 'block' : 'none';
  };

  // Apply sort
  window.applySort = function() {
    const sortValue = document.getElementById('sort-filter').value;
    
    if (sortValue === 'price-asc') {
      filteredProducts.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-desc') {
      filteredProducts.sort((a, b) => b.price - a.price);
    } else if (sortValue === 'newest') {
      filteredProducts.sort((a, b) => b.id - a.id);
    }
    
    displayProducts(filteredProducts);
    // Close popup after selection
    document.getElementById('sort-popup').style.display = 'none';
  };

  await loadProducts();
});

// Initialize wishlist UI after DOM loads
if (typeof updateWishlistUI === 'function') {
  setTimeout(() => updateWishlistUI(), 100);
}
