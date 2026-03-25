let appliedDiscount = 0;
let appliedCoupon = null;

document.addEventListener('DOMContentLoaded', () => {
  displayCart();
  setupCouponSystem();

  document.getElementById('apply-coupon').addEventListener('click', validateCoupon);
  document.getElementById('coupon-code').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') validateCoupon();
  });
});

function displayCart() {
  const cartItemsDiv = document.getElementById('cart-items');
  
  if (cart.items.length === 0) {
    cartItemsDiv.innerHTML = `<p data-translate="empty_cart">Your cart is empty</p>`;
    updateCartSummary();
    return;
  }

  cartItemsDiv.innerHTML = `
    <div class="cart-table">
      ${cart.items.map(item => `
        <div class="cart-item">
          <span><img src="/images/${item.image}" alt="${currentLanguage === 'en' ? item.name_en : item.name_el}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px;" onerror="this.src='/images/default.jpg'"></span>
          <span>${currentLanguage === 'en' ? item.name_en : item.name_el}</span>
          <span style="margin-right: 50px;">€${item.price.toFixed(2)}</span>
          <input type="number" value="${item.quantity}" min="1" 
            onchange="updateQuantity(${item.id}, this.value)">
          <span style="margin-left: 50px;">€${(item.price * item.quantity).toFixed(2)}</span>
          <span><button onclick="removeFromCart(${item.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;"><i class="fa-solid fa-xmark"></i></button></span>
        </div>
      `).join('')}
    </div>
  `;

  updateCartSummary();
}

function updateQuantity(productId, quantity) {
  cart.updateQuantity(productId, parseInt(quantity));
  displayCart();
}

function removeFromCart(productId) {
  cart.removeItem(productId);
  displayCart();
}

function updateCartSummary() {
  const subtotal = cart.getTotal();
  
  document.getElementById('subtotal').textContent = `€${subtotal.toFixed(2)}`;
  document.getElementById('discount').textContent = `€${appliedDiscount.toFixed(2)}`;
  
  if (cart.items.length === 0) {
    document.getElementById('shipping').textContent = `€0.00`;
    document.getElementById('total').textContent = `€0.00`;
    return;
  }
  
  const shippingElement = document.querySelector('#shipping');
  const shippingCost = shippingElement ? parseFloat(shippingElement.textContent.replace('€', '')) : 5;
  document.getElementById('shipping').textContent = `€${shippingCost.toFixed(2)}`;
  
  const total = subtotal - appliedDiscount + shippingCost;
  document.getElementById('total').textContent = `€${total.toFixed(2)}`;
}

function setupCouponSystem() {
  // This is handled in validateCoupon function
}

async function validateCoupon() {
  const couponCode = document.getElementById('coupon-code').value.trim();
  const messageDiv = document.getElementById('coupon-message');
  
  if (!couponCode) {
    messageDiv.innerHTML = `<p class="error" data-translate="coupon_code">${t('coupon_code')}</p>`;
    return;
  }

  try {
    const response = await fetch('/api/validate-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponCode })
    });

    if (response.ok) {
      const { coupon } = await response.json();
      const subtotal = cart.getTotal();
      
      if (coupon.discount_type === 'percentage') {
        appliedDiscount = subtotal * (coupon.discount_value / 100);
      } else {
        appliedDiscount = coupon.discount_value;
      }
      
      appliedCoupon = coupon;
      messageDiv.innerHTML = `<p class="success" data-translate="coupon_applied">${t('coupon_applied')}</p>`;
      updateCartSummary();
    } else {
      const error = await response.json();
      messageDiv.innerHTML = `<p class="error">${error.error}</p>`;
      appliedDiscount = 0;
      appliedCoupon = null;
      updateCartSummary();
    }
  } catch (error) {
    console.error('Coupon validation error:', error);
  }
}
