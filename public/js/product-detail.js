document.addEventListener('DOMContentLoaded', async () => {
  // Parse product ID from URL - handle both /product/1 and /el/product/1 formats
  const pathParts = window.location.pathname.split('/').filter(part => part !== '');
  
  // Determine language from URL
  const isGreek = pathParts[0] === 'el';
  if (isGreek) {
    localStorage.setItem('language', 'el');
  }
  
  // Manually load translations to ensure they're ready
  const lang = localStorage.getItem('language') || 'en';
  try {
    const response = await fetch(`/lang/${lang}.json`);
    if (response.ok) {
      window.translations = await response.json();
      window.currentLanguage = lang;
    }
  } catch (error) {
    console.error('Error loading translations:', error);
  }
  
  // Make translations globally available
  window.translations = window.translations || {};
  
  // Wait for translations to be loaded
  const waitForTranslations = () => {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        attempts++;
        if (window.translations && Object.keys(window.translations).length > 0) {
          resolve();
        } else if (attempts >= 20) {
          resolve(); // Timeout, continue anyway
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  };
  
  await waitForTranslations();
  
  console.log('currentLanguage:', window.currentLanguage);
  console.log('translations loaded:', window.translations ? Object.keys(window.translations).length : 0);
  
  // pathParts should be ['product', '1'] for /product/1 or ['el', 'product', '1'] for /el/product/1
  const productId = pathParts.length >= 2 ? pathParts[pathParts.length - 1] : null;
  
  console.log('Product ID:', productId);
  console.log('Full path:', window.location.pathname);
  
  if (!productId || isNaN(parseInt(productId))) {
    document.getElementById('product-detail').innerHTML = '<p>Invalid product ID: "' + productId + '"</p>';
    return;
  }
  
  try {
    console.log('Fetching product from /api/product/' + productId);
    const response = await fetch('/api/product/' + productId);
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error('Product not found - Status: ' + response.status);
    }
    
    const product = await response.json();
    console.log('Product:', product);

    const detailDiv = document.getElementById('product-detail');
    const lang = typeof window.currentLanguage !== 'undefined' ? window.currentLanguage : 'en';
    const name = lang === 'en' ? product.name_en : product.name_el;
    const description = lang === 'en' ? product.description_en : product.description_el;

    // Fetch reviews data
    const reviewsResponse = await fetch(`/api/reviews/${productId}/average`);
    const reviewsData = await reviewsResponse.json();
    const hasReviews = reviewsData.count > 0;

    // Generate stars HTML
    const getStarsHTML = (rating) => {
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
    };

    // Translation helper
    const t = (key) => (window.translations && window.translations[key]) || key;

    detailDiv.innerHTML = `
      <div class="product-detail-container">
        <div class="product-detail-image">
          ${(product.images && product.images.length > 0) || product.image ? `
          <div class="image-carousel">
            <div class="carousel-images">
              ${product.image ? `<img src="/images/${product.image}" alt="${name}" class="carousel-image active">` : ''}
              ${product.images ? product.images.map(img => `<img src="/images/${img.image_path}" alt="${name}" class="carousel-image">`).join('') : ''}
            </div>
            ${((product.images && product.images.length > 0) || product.image) ? `
            <div class="carousel-indicators">
              ${product.image ? `<span class="indicator active" onclick="goToImage(0)"></span>` : ''}
              ${product.images ? product.images.map((_, idx) => `<span class="indicator" onclick="goToImage(${product.image ? idx + 1 : idx})"></span>`).join('') : ''}
            </div>
            ` : ''}
          </div>
          ` : `<img src="/images/${product.image}" alt="${name}" onerror="this.src='/images/default.jpg'">`}
        </div>
        <div class="product-detail-info">
          <h1>${name}</h1>
          <p class="brand">${product.brand}</p>
          ${product.short_description_en || product.short_description_el ? `
            <p class="short-description">${window.currentLanguage === 'el' ? product.short_description_el : product.short_description_en}</p>
          ` : ''}
          <p class="category" data-translate="category">${t(product.category.toLowerCase()) || product.category}</p>
          
          <div class="product-rating">
            ${hasReviews ? 
              `<div class="stars">${getStarsHTML(reviewsData.average)}</div>
               <span class="rating-count">(${reviewsData.count} ${t('reviews_count')})</span>` :
              `<span class="no-reviews">${t('no_reviews_yet')}</span>`
            }
          </div>
          <p class="price">€${product.price.toFixed(2)}</p>
          
          ${product.stock > 0 ? `
            <div class="add-to-cart-section">
              <div class="quantity-selector">
                <input type="number" id="quantity" value="1" min="1" max="${product.stock}">
              </div>
              <button class="wishlist-btn" data-id="${product.id}" onclick="toggleWishlist(${product.id})" title="${t('add_to_wishlist')}">
                <i class="far fa-heart"></i>
              </button>
              <button id="add-to-cart-btn" class="cart-icon-btn" title="${t('add_to_cart')}"><i class="fa-solid fa-bag-shopping"></i></button>
            </div>
          ` : `
            <button class="btn btn-disabled" data-translate="out_of_stock">${t('out_of_stock')}</button>
          `}
          
          ${product.skin_type ? `
            <div class="product-skin-type">
              <h3 data-translate="skin_type">${t('skin_type')}</h3>
              <p>${product.skin_type === 'All' ? t('all') : (t('skin_type_' + product.skin_type.toLowerCase()) || product.skin_type)}</p>
            </div>
          ` : ''}
          
          <div class="product-description">
            <h3 data-translate="description">${t('description')}</h3>
            <p>${description}</p>
          </div>
          
          ${product.ingredients_en || product.ingredients_el ? `
            <div class="product-ingredients">
              <h3 data-translate="ingredients">${t('ingredients')}</h3>
              <p>${window.currentLanguage === 'el' ? product.ingredients_el : product.ingredients_en}</p>
            </div>
          ` : ''}

        </div>
      </div>
      
      <!-- Reviews Section -->
      <div class="reviews-section">
        <h2 data-translate="reviews">${t('reviews')}</h2>
        
        <!-- Reviews List -->
        <div class="reviews-list" id="reviews-list">
          <!-- Reviews loaded by JavaScript -->
        </div>
        
        <!-- Add Review Form -->
        <div class="add-review-form">
          <h3 data-translate="write_review">${t('write_review')}</h3>
          <form id="review-form">
            <div class="form-group">
              <label data-translate="your_rating">${t('your_rating')}</label>
              <div class="rating-input">
                <i class="far fa-star rating-star" data-rating="1"></i>
                <i class="far fa-star rating-star" data-rating="2"></i>
                <i class="far fa-star rating-star" data-rating="3"></i>
                <i class="far fa-star rating-star" data-rating="4"></i>
                <i class="far fa-star rating-star" data-rating="5"></i>
              </div>
              <input type="hidden" id="rating-value" required>
            </div>
            <div class="form-group" id="show-name-group" style="display: none;">
              <label>
                <input type="checkbox" id="show-name-checkbox">
                ${t('display_name')}
              </label>
            </div>
            <div class="form-group">
              <label data-translate="your_review">${t('your_review')}</label>
              <textarea id="review-comment" rows="2" placeholder="${t('share_experience')}"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" data-translate="submit_review">${t('submit_review')}</button>
          </form>
        </div>
      </div>
      
      <!-- New Arrivals Section -->
      <div class="new-arrivals-section">
        <h2 data-translate="new_arrivals">${t('new_arrivals')}</h2>
        <div class="products-grid" id="new-arrivals-grid">
          <!-- New arrivals loaded by JavaScript -->
        </div>
      </div>
    `;

    // Rating input handling
    const ratingStars = document.querySelectorAll('.rating-star');
    const ratingValue = document.getElementById('rating-value');
    
    ratingStars.forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        ratingValue.value = rating;
        updateStarDisplay(rating);
      });
      
      star.addEventListener('mouseover', () => {
        const rating = parseInt(star.dataset.rating);
        updateStarDisplay(rating);
      });
      
      star.addEventListener('mouseout', () => {
        const currentRating = parseInt(ratingValue.value) || 0;
        updateStarDisplay(currentRating);
      });
    });
    
    function updateStarDisplay(rating) {
      ratingStars.forEach((star, index) => {
        if (index < rating) {
          star.classList.remove('far');
          star.classList.add('fas');
          star.style.color = '#f1ab13';
        } else {
          star.classList.remove('fas');
          star.classList.add('far');
          star.style.color = '#f1ab13';
        }
      });
    }

    // Show/hide name checkbox based on login status
    const showNameGroup = document.getElementById('show-name-group');
    const userAuthTokenCheck = localStorage.getItem('userToken');
    if (userAuthTokenCheck) {
      showNameGroup.style.display = 'block';
    }

    // Submit review
    document.getElementById('review-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Get user name from logged in user
      let name = '';
      let userId = null;
      const userAuthToken1 = localStorage.getItem('userToken');
      if (userAuthToken1) {
        try {
          const decoded = atob(userAuthToken1);
          const email = decoded.split(':')[0];
          const userResponse = await fetch('/api/user/by-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id;
            name = userData.name;
            
            // Check if user wants to show their name or stay anonymous
            const showNameCheckbox = document.getElementById('show-name-checkbox');
            if (showNameCheckbox && !showNameCheckbox.checked) {
              name = 'Anonymous';
            }
          }
        } catch (e) {
          console.log('Could not get user info');
        }
      }
      
      // If not logged in, don't send user_name - server will set as "Anonymous"
      const user_name = name || undefined;
      
      const rating = parseInt(document.getElementById('rating-value').value);
      const comment = document.getElementById('review-comment').value;
      
      if (!rating) {
        console.log('Please select a rating');
        return;
      }
      
      // Get user_id if logged in
      userId = null;
      let userAuthToken = localStorage.getItem('userToken');
      if (userAuthToken) {
        try {
          const decoded = atob(userAuthToken);
          const email = decoded.split(':')[0];
          const userResponse = await fetch('/api/user/by-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            userId = userData.id;
          }
        } catch (e) {
          console.log('Could not get user info');
        }
      }
      
      try {
        const reviewData = {
          product_id: productId,
          user_name: name || 'Anonymous',
          rating: rating,
          comment: comment
        };
        
        // Add user_id if user is logged in
        if (userId) {
          reviewData.user_id = userId;
        }
        
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData)
        });
        
        if (response.ok) {
          console.log('Review submitted successfully');
          document.getElementById('review-form').reset();
          ratingValue.value = '';
          updateStarDisplay(0);
          loadReviews(); // Reload reviews
          // Reload average rating
          const newReviewsData = await fetch(`/api/reviews/${productId}/average`).then(r => r.json());
          const ratingDiv = document.querySelector('.product-rating');
          if (newReviewsData.count > 0) {
            ratingDiv.innerHTML = `<div class="stars">${getStarsHTML(newReviewsData.average)}</div>
             <span class="rating-count">(${newReviewsData.count} ${t('reviews_count')})</span>`;
          } else {
            ratingDiv.innerHTML = `<span class="no-reviews">${t('no_reviews_yet')}</span>`;
          }
        } else {
          console.log('Failed to submit review');
        }
      } catch (error) {
        console.error('Error submitting review:', error);
        console.log('Failed to submit review');
      }
    });

    // Load reviews
    async function loadReviews() {
      try {
        const reviewsResponse = await fetch(`/api/reviews/${productId}`);
        const reviews = await reviewsResponse.json();
        
        const reviewsList = document.getElementById('reviews-list');
        
        // Get logged in user info
        const userAuthToken = localStorage.getItem('userToken');
        let currentUserId = null;
        
        if (userAuthToken) {
          try {
            const decoded = atob(userAuthToken);
            const email = decoded.split(':')[0];
            // Get user by email from server
            const userResponse = await fetch('/api/user/by-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            if (userResponse.ok) {
              const userData = await userResponse.json();
              currentUserId = userData.id;
            }
          } catch (e) {
            console.log('Could not decode user token');
          }
        }
        
        if (reviews.length === 0) {
          reviewsList.innerHTML = `<p class="no-reviews-message">${t('no_reviews_yet')}. ${t('be_first_review')}</p>`;
        } else {
          reviewsList.innerHTML = reviews.map(review => {
            const isOwnReview = currentUserId && review.user_id === currentUserId;
            return `
              <div class="review-card" data-review-id="${review.id}">
                <div class="review-header">
                  <span class="reviewer-name">${review.user_name}</span>
                  <div class="review-stars">${getStarsHTML(review.rating)}</div>
                </div>
                <p class="review-date">${new Date(review.created_at).toLocaleDateString()}</p>
                ${review.comment ? `<p class="review-comment">${review.comment}</p>` : ''}
                ${isOwnReview ? `<button class="btn btn-sm btn-danger delete-review-btn" data-id="${review.id}">${t('delete')}</button>` : ''}
              </div>
            `;
          }).join('');
          
          // Add delete event listeners
          document.querySelectorAll('.delete-review-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const reviewId = e.target.dataset.id;
                try {
                  const response = await fetch(`/api/reviews/user/${reviewId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${userAuthToken}` }
                  });
                  
                  if (response.ok) {
                    console.log('Review deleted');
                    loadReviews();
                    // Reload average rating
                    const newReviewsData = await fetch(`/api/reviews/${productId}/average`).then(r => r.json());
                    const ratingDiv = document.querySelector('.product-rating');
                    if (newReviewsData.count > 0) {
                      ratingDiv.innerHTML = `<div class="stars">${getStarsHTML(newReviewsData.average)}</div>
                       <span class="rating-count">(${newReviewsData.count} ${t('reviews_count')})</span>`;
                    } else {
                      ratingDiv.innerHTML = `<span class="no-reviews">${t('no_reviews_yet')}</span>`;
                    }
                  } else {
                    const error = await response.json();
                    console.log(error.error || 'Failed to delete review');
                  }
                } catch (error) {
                  console.error('Error deleting review:', error);
                  console.log('Failed to delete review');
                }
            });
          });
        }
      } catch (error) {
        console.error('Error loading reviews:', error);
      }
    }
    
    loadReviews();
    
    // Load new arrivals
    async function loadNewArrivals() {
      try {
        const response = await fetch('/api/products');
        const products = await response.json();
        const newArrivals = products.filter(p => p.new_arrival === 1).slice(0, 3);
        
        const grid = document.getElementById('new-arrivals-grid');
        if (!grid) return;
        
        if (newArrivals.length === 0) {
          grid.innerHTML = '<p>No new arrivals available</p>';
          return;
        }
        
        // Fetch reviews for all products
        const reviewsPromises = newArrivals.map(p => 
          fetch(`/api/reviews/${p.id}/average`).then(r => r.json())
        );
        const reviewsData = await Promise.all(reviewsPromises);
        
        grid.innerHTML = newArrivals.map((product, index) => {
          const reviews = reviewsData[index];
          const hasReviews = reviews && reviews.count > 0;
          return `
            <div class="product-card" onclick="window.location.href='/${window.currentLanguage === 'el' ? 'el/' : ''}product/${product.id}'">
              <div class="product-image">
                <img src="/images/${product.image}" alt="${window.currentLanguage === 'en' ? product.name_en : product.name_el}" onerror="this.src='/images/default.jpg'">
              </div>
              <div class="product-info">
                <p class="brand">${product.brand}</p>
                <h3>${window.currentLanguage === 'en' ? product.name_en : product.name_el}</h3>
                <div class="price-row">
                  <p class="price">€${product.price.toFixed(2)}</p>
                  <button class="wishlist-btn" data-id="${product.id}" onclick="event.stopPropagation(); toggleWishlist(${product.id})">
                    <i class="far fa-heart"></i>
                  </button>
                  <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(${product.id})"><i class="fas fa-shopping-bag"></i></button>
                </div>
                <div class="rating-row">
                  ${hasReviews ? 
                    `<div class="stars">${getStarsHTML(reviews.average)}</div>` : 
                    `<span style="color: gray; font-size: 12px;">${t('no_reviews_yet')}</span>`
                  }
                </div>
              </div>
            </div>
          `;
        }).join('');
      } catch (error) {
        console.error('Error loading new arrivals:', error);
      }
    }
    loadNewArrivals();

    // Add to cart functionality
    const addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const quantity = parseInt(document.getElementById('quantity').value);
        cart.addItem({
          ...product,
          quantity
        });
        console.log(t('success_message'));
      });
    }
  } catch (error) {
    console.error('Error loading product:', error);
    document.getElementById('product-detail').innerHTML = '<p data-translate="not_found">Product not found</p>';
  }
  
  // Initialize wishlist UI after product is loaded
  if (typeof updateWishlistUI === 'function') {
    setTimeout(() => updateWishlistUI(), 100);
  }
  
  // Carousel functionality
  let currentImageIndex = 0;
  let totalImages = 0;
  
  window.goToImage = function(index) {
    const images = document.querySelectorAll('.carousel-image');
    const indicators = document.querySelectorAll('.indicator');
    
    if (images.length === 0 || index >= images.length) return;
    
    // Remove active class from current image
    if (images[currentImageIndex]) {
      images[currentImageIndex].classList.remove('active');
    }
    if (indicators[currentImageIndex]) {
      indicators[currentImageIndex].classList.remove('active');
    }
    
    // Set new index
    currentImageIndex = index;
    
    // Add active class to new image
    if (images[currentImageIndex]) {
      images[currentImageIndex].classList.add('active');
    }
    if (indicators[currentImageIndex]) {
      indicators[currentImageIndex].classList.add('active');
    }
  };
});
