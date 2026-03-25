let stripe;
let elements;
let cardElement;
let selectedShippingMethod = null;
let appliedCoupon = null;
let appliedDiscount = 0;

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Stripe
  const publishableKey = 'pk_test_51234567890'; // Replace with your Stripe key
  stripe = Stripe(publishableKey);
  elements = stripe.elements();
  cardElement = elements.create('card');
  cardElement.mount('#card-element');

  // Load shipping methods
  await loadShippingMethods();

  // Display order summary
  displayCheckoutSummary();

  // Load saved delivery info if user is logged in
  await loadSavedDeliveryInfo();

  // Form submission
  document.getElementById('checkout-form').addEventListener('submit', handleCheckout);
});

async function loadSavedDeliveryInfo() {
  const userToken = localStorage.getItem('userToken');
  
  if (!userToken) {
    return; // Not logged in, leave form empty
  }
  
  try {
    // Decode token to get email
    const decoded = atob(userToken);
    const email = decoded.split(':')[0];
    
    // Fetch user data
    const userResponse = await fetch('/api/user/by-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (userResponse.ok) {
      const user = await userResponse.json();
      
      // Pre-fill the form with saved delivery information
      if (user.address || user.city || user.postal_code || user.country || user.phone) {
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('address').value = user.address || '';
        document.getElementById('city').value = user.city || '';
        document.getElementById('postalCode').value = user.postal_code || '';
        document.getElementById('country').value = user.country || '';
        
        // Show saved info indicator
        const savedInfoDiv = document.createElement('div');
        savedInfoDiv.id = 'saved-info-notice';
        savedInfoDiv.className = 'saved-info-notice';
        savedInfoDiv.innerHTML = '<i class="fa-solid fa-info-circle"></i> Delivery information loaded from your profile. <a href="/profile" onclick="return false;" id="edit-saved-info">Edit in Profile</a>';
        
        // Add the notice after the form legend
        const legend = document.querySelector('#checkout-form fieldset:nth-of-type(2) legend');
        if (legend) {
          legend.after(savedInfoDiv);
        }
        
        // Add click handler to the edit link
        document.getElementById('edit-saved-info').addEventListener('click', (e) => {
          e.preventDefault();
          window.location.href = '/profile';
        });
      }
    }
  } catch (error) {
    console.error('Error loading saved delivery info:', error);
  }
}

async function loadShippingMethods() {
  try {
    const response = await fetch('/api/shipping-methods');
    let methods = await response.json();

    // Limit to only 3 shipping methods
    methods = methods.slice(0, 3);

    const optionsDiv = document.getElementById('shipping-options');
    optionsDiv.innerHTML = methods.map(method => `
      <label class="shipping-option">
        <input type="radio" name="shipping-method" value="${method.id}" required>
        <span>${method.name} - €${method.price.toFixed(2)}</span>
      </label>
    `).join('');

    document.querySelectorAll('input[name="shipping-method"]').forEach(radio => {
      radio.addEventListener('change', () => {
        selectedShippingMethod = radio.value;
        updateCheckoutSummary();
      });
    });

    // Select first method by default
    if (methods.length > 0) {
      document.querySelector('input[name="shipping-method"]').checked = true;
      selectedShippingMethod = methods[0].id;
    }
  } catch (error) {
    console.error('Error loading shipping methods:', error);
  }
}

function displayCheckoutSummary() {
  const itemsDiv = document.getElementById('checkout-items');
  itemsDiv.innerHTML = cart.items.map(item => `
    <div class="checkout-item">
      <span>${currentLanguage === 'en' ? item.name_en : item.name_el} x${item.quantity}</span>
      <span>€${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');

  updateCheckoutSummary();
}

function updateCheckoutSummary() {
  const subtotal = cart.getTotal();
  document.getElementById('checkout-subtotal').textContent = `€${subtotal.toFixed(2)}`;

  let shippingCost = 5;
  if (selectedShippingMethod) {
    fetch(`/api/shipping-methods`)
      .then(r => r.json())
      .then(methods => {
        const method = methods.find(m => m.id == selectedShippingMethod);
        if (method) {
          shippingCost = method.price;
          document.getElementById('checkout-shipping').textContent = `€${shippingCost.toFixed(2)}`;
          updateTotal(subtotal, shippingCost);
        }
      });
  }
}

function updateTotal(subtotal, shippingCost) {
  const total = subtotal - appliedDiscount + shippingCost;
  document.getElementById('checkout-total').textContent = `€${total.toFixed(2)}`;
}

async function handleCheckout(e) {
  e.preventDefault();

  if (cart.items.length === 0) {
    alert(t('empty_cart'));
    return;
  }

  if (!selectedShippingMethod) {
    alert('Please select a shipping method');
    return;
  }

  // Create Stripe checkout session
  try {
    const couponCode = localStorage.getItem('appliedCoupon');
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.items,
        couponCode: couponCode,
        shippingMethod: selectedShippingMethod
      })
    });

    const { sessionId } = await response.json();
    
    // Save checkout data to localStorage
    localStorage.setItem('checkoutData', JSON.stringify({
      email: document.getElementById('email').value,
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      postalCode: document.getElementById('postalCode').value,
      country: document.getElementById('country').value,
      phone: document.getElementById('phone').value,
      items: cart.items,
      shippingMethod: selectedShippingMethod,
      couponCode: couponCode
    }));

    // Redirect to Stripe checkout
    const stripeCheckout = await stripe.redirectToCheckout({
      sessionId: sessionId
    });

    if (stripeCheckout.error) {
      alert(stripeCheckout.error.message);
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert(t('error_message'));
  }
}

// Handle card errors
cardElement.addEventListener('change', (event) => {
  const displayError = document.getElementById('card-errors');
  if (event.error) {
    displayError.textContent = event.error.message;
  } else {
    displayError.textContent = '';
  }
});
