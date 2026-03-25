document.addEventListener('DOMContentLoaded', async () => {
  displayWishlist();
});

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
  displayWishlist();
}

async function displayWishlist() {
  const wishlistContent = document.getElementById('wishlist-content');
  if (!wishlistContent) return;
  
  const wishlist = getWishlist();
  
  if (wishlist.length === 0) {
    wishlistContent.innerHTML = '<p class="empty-wishlist">' + (currentLanguage === 'en' ? 'Your wishlist is empty' : 'Η λίστα επιθυμιών σας είναι κενή') + '</p>';
    return;
  }
  
  try {
    const response = await fetch('/api/products');
    const allProducts = await response.json();
    
    const wishlistProducts = allProducts.filter(p => wishlist.includes(p.id));
    
    if (wishlistProducts.length === 0) {
      wishlistContent.innerHTML = '<p class="empty-wishlist">' + (currentLanguage === 'en' ? 'Your wishlist is empty' : 'Η λίστα επιθυμιών σας είναι κενή') + '</p>';
      return;
    }
    
    // Fetch ratings for wishlist products
    const reviewsPromises = wishlistProducts.map(p => 
      fetch(`/api/reviews/${p.id}/average`).then(r => r.json())
    );
    const reviewsData = await Promise.all(reviewsPromises);
    
    wishlistContent.innerHTML = `
      <div class="wishlist-grid">
        ${wishlistProducts.map((product, idx) => {
          const reviews = reviewsData[idx];
          const hasReviews = reviews && reviews.count > 0;
          const rating = reviews ? reviews.average : 0;
          
          const getStarsHTML = (rating) => {
            const fullStars = Math.floor(rating);
            let starsHTML = '';
            for (let i = 0; i < 5; i++) {
              if (i < fullStars) {
                starsHTML += '<i class="fas fa-star" style="color: #f1ab13;"></i>';
              } else {
                starsHTML += '<i class="far fa-star" style="color: #f1ab13;"></i>';
              }
            }
            return starsHTML;
          };
          
          return `
            <div class="product-card">
              <div class="product-image" onclick="window.location.href='/${currentLanguage === 'el' ? 'el/' : ''}product/${product.id}'">
                <img src="/images/${product.image}" alt="${currentLanguage === 'en' ? product.name_en : product.name_el}" onerror="this.src='/images/default.jpg'">
              </div>
              <div class="product-info">
                <p class="brand">${product.brand}</p>
                <h3>${currentLanguage === 'en' ? product.name_en : product.name_el}</h3>
                <div class="price-row">
                  <p class="price">€${product.price.toFixed(2)}</p>
                  <button class="wishlist-btn" data-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist(${product.id})">
                    <i class="fa-solid fa-heart"></i>
                  </button>
                  <button class="add-to-cart-btn" onclick="addToCart(${product.id}); toggleWishlist(${product.id})">
                    <i class="fas fa-shopping-bag"></i>
                  </button>
                </div>
                <div class="rating-row">
                  ${hasReviews ? 
                    `<div class="stars">${getStarsHTML(rating)}</div>` : 
                    `<span style="color: gray; font-size: 12px;">${currentLanguage === 'en' ? 'No reviews yet' : 'Δεν υπάρχουν ακόμα κριτικές'}</span>`
                  }
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    console.error('Error loading wishlist:', error);
    wishlistContent.innerHTML = '<p>Error loading wishlist</p>';
  }
}

// Initialize wishlist UI
if (typeof updateWishlistUI === 'function') {
  updateWishlistUI();
}