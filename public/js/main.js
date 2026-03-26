document.addEventListener('DOMContentLoaded', async () => {
  try {
    // For static GitHub Pages: fetch from JSON file
    // For Node.js server: fetch from API
    let products = [];
    const apiUrl = '/api/products';
    const jsonUrl = '/products.json';
    
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        products = await response.json();
      } else {
        throw new Error('API not available');
      }
    } catch (apiError) {
      // Fall back to JSON file for static deployment
      const jsonResponse = await fetch(jsonUrl);
      products = await jsonResponse.json();
    }
    
    // Function to get rating for a product
    async function getProductRating(productId) {
      try {
        const ratingResponse = await fetch(`/api/reviews/${productId}/average`);
        return await ratingResponse.json();
      } catch (e) {
        // For static mode: return default rating
        return { average: 0, count: 0 };
      }
    }
    
    // Function to generate stars HTML
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
    
    // Featured Products (marked as featured in admin)
    const featuredProducts = products.filter(p => p.featured == 1).slice(0, 3);
    const featuredContainer = document.getElementById('featured-products');
    
    if (featuredContainer) {
      // Fetch ratings for all featured products
      const featuredWithRatings = await Promise.all(featuredProducts.map(async (product) => {
        const rating = await getProductRating(product.id);
        return { ...product, rating };
      }));
      
      featuredContainer.innerHTML = featuredWithRatings.length > 0 ? featuredWithRatings.map(product => {
        const hasReviews = product.rating.count > 0;
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
                `<div class="stars">${getStarsHTML(product.rating.average)}</div>` :
                `<span style="color: gray; font-size: 12px;">${currentLanguage === 'en' ? 'No reviews yet' : 'Δεν υπάρχουν ακόμα κριτικές'}</span>`
              }
            </div>
          </div>
        </div>
      `;
      }).join('') : '<p class="no-products">No featured products available</p>';
    }

    // New Arrivals - products marked as new arrival in admin
    const newArrivalsProducts = products.filter(p => p.new_arrival === 1).slice(0, 3);
    const newArrivalsContainer = document.getElementById('new-arrivals-products');
    
    if (newArrivalsContainer) {
      // Fetch ratings for all new arrival products
      const newArrivalsWithRatings = await Promise.all(newArrivalsProducts.map(async (product) => {
        const rating = await getProductRating(product.id);
        return { ...product, rating };
      }));
      
      newArrivalsContainer.innerHTML = newArrivalsWithRatings.length > 0 ? newArrivalsWithRatings.map(product => {
        const hasReviews = product.rating.count > 0;
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
                `<div class="stars">${getStarsHTML(product.rating.average)}</div>` :
                `<span style="color: gray; font-size: 12px;">${currentLanguage === 'en' ? 'No reviews yet' : 'Δεν υπάρχουν ακόμα κριτικές'}</span>`
              }
            </div>
          </div>
        </div>
      `;
      }).join('') : '<p class="no-products">No new arrivals available</p>';
    }
  } catch (error) {
    console.error('Error loading featured products:', error);
  }

  // Initialize wishlist UI after products are loaded
  if (typeof updateWishlistUI === 'function') {
    updateWishlistUI();
  }

  // Newsletter subscription
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input[type="email"]').value;
      
      try {
        const response = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        if (response.ok) {
          alert(t('success_message'));
          newsletterForm.reset();
        }
      } catch (error) {
        console.error('Newsletter error:', error);
        alert(t('error_message'));
      }
    });
  }
});

// Wishlist functionality
function getWishlist() {
  return JSON.parse(localStorage.getItem('wishlist') || '[]');
}

function saveWishlist(wishlist) {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  updateWishlistUI();
}

function updateWishlistUI() {
  const wishlist = getWishlist();
  const wishlistCount = document.getElementById('wishlist-count');
  if (wishlistCount) {
    wishlistCount.textContent = wishlist.length;
  }
  
  // Update all wishlist buttons
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productId = parseInt(btn.getAttribute('data-id'));
    const icon = btn.querySelector('i');
    if (wishlist.includes(productId)) {
      icon.classList.remove('far', 'fa-regular');
      icon.classList.add('fas', 'fa-solid');
    } else {
      icon.classList.remove('fas', 'fa-solid');
      icon.classList.add('far', 'fa-regular');
    }
  });
}

function toggleWishlist(productId) {
  let wishlist = getWishlist();
  const index = wishlist.indexOf(productId);
  
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  
  saveWishlist(wishlist);
  updateWishlistUI();
}
