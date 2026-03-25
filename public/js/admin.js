let adminToken = localStorage.getItem('adminToken');

document.addEventListener('DOMContentLoaded', async () => {
  if (adminToken) {
    showAdminPanel();
  } else {
    showLoginForm();
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Admin menu navigation
  document.querySelectorAll('.admin-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = e.target.getAttribute('href').substring(1);
      console.log('Clicked section:', sectionId);
      document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
      const targetSection = document.getElementById(sectionId);
      console.log('Target section:', targetSection);
      if (targetSection) {
        targetSection.style.display = 'block';
      }
      
      // Load reviews when switching to reviews section
      if (sectionId === 'reviews') {
        console.log('Loading reviews...');
        loadReviews();
      }
    });
  });

  // Add product button
  const addProductBtn = document.getElementById('add-product-btn');
  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      document.getElementById('product-form').reset();
      document.getElementById('product-form-title').textContent = t('add_product');
      document.getElementById('product-form-modal').style.display = 'block';
    });
  }

  // Close modals
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
      e.target.closest('.modal').style.display = 'none';
    });
  });

  // Modal close on outside click
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });

  // Product form
  document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('coupon-form')?.addEventListener('submit', handleCouponSubmit);
  document.getElementById('shipping-form')?.addEventListener('submit', handleShippingSubmit);

  document.getElementById('add-coupon-btn')?.addEventListener('click', () => {
    document.getElementById('coupon-form').reset();
    document.getElementById('coupon-form-modal').style.display = 'block';
  });

  document.getElementById('add-shipping-btn')?.addEventListener('click', () => {
    document.getElementById('shipping-form').reset();
    document.getElementById('shipping-form-modal').style.display = 'block';
  });

  document.getElementById('generate-products-btn')?.addEventListener('click', generateProducts);
});

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const { token } = await response.json();
      adminToken = token;
      localStorage.setItem('adminToken', token);
      showAdminPanel();
    } else {
      alert(t('invalid_credentials'));
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  adminToken = null;
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('admin-section').style.display = 'none';
}

function showLoginForm() {
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('admin-section').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('admin-section').style.display = 'block';
  document.getElementById('logout-btn').style.display = 'inline';
  loadAllData();
}

async function loadAllData() {
  loadProducts();
  loadReviews();
  loadCoupons();
  loadShippingMethods();
  loadOrders();
  loadSubscribers();
  loadComplaints();
}

async function loadReviews() {
  console.log('loadReviews function called');
  try {
    const response = await fetch('/api/admin/reviews', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('Reviews API response status:', response.status);
    const reviews = await response.json();
    console.log('Reviews data:', reviews);

    const tbody = document.querySelector('#reviews-table tbody');
    console.log('Reviews table body:', tbody);
    if (!tbody) {
      console.error('Reviews table tbody not found!');
      return;
    }
    
    if (reviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No reviews yet</td></tr>';
      return;
    }

    tbody.innerHTML = reviews.map(review => {
      const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
      return `
        <tr>
          <td>${review.id}</td>
          <td>${currentLanguage === 'en' ? (review.name_en || 'Unknown') : (review.name_el || 'Unknown')}</td>
          <td>${review.user_name}</td>
          <td><span style="color: #f1ab13;">${stars}</span> (${review.rating}/5)</td>
          <td>${review.comment || '-'}</td>
          <td>${new Date(review.created_at).toLocaleDateString()}</td>
          <td>
            <button class="btn btn-sm btn-danger" onclick="deleteReview(${review.id})">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading reviews:', error);
  }
}

async function deleteReview(id) {
  console.log('deleteReview called with id:', id);
  console.log('adminToken:', adminToken);
  
  if (!adminToken) {
    alert('Please log in as admin first');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this review?')) {
    return;
  }
  
  try {
    console.log('Making DELETE request to /api/reviews/' + id);
    const response = await fetch(`/api/reviews/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('DELETE response status:', response.status);
    console.log('DELETE response ok:', response.ok);
    
    if (response.ok) {
      alert('Review deleted successfully');
      loadReviews();
    } else {
      alert('Failed to delete review');
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('Failed to delete review');
  }
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();

    const tbody = document.querySelector('#products-table tbody');
    tbody.innerHTML = products.map(product => `
      <tr>
        <td>${product.id}</td>
        <td>${currentLanguage === 'en' ? product.name_en : product.name_el}</td>
        <td>€${product.price.toFixed(2)}</td>
        <td>${product.featured == 1 ? '✓' : '-'}</td>
        <td>${product.new_arrival == 1 ? '✓' : '-'}</td>
        <td>${product.stock}</td>
        <td>
          <button class="btn btn-sm" onclick="editProduct(${product.id})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

async function editProduct(id) {
  try {
    const response = await fetch(`/api/product/${id}`);
    const product = await response.json();

    document.getElementById('name_en').value = product.name_en;
    document.getElementById('name_el').value = product.name_el;
    document.getElementById('short_description_en').value = product.short_description_en || '';
    document.getElementById('short_description_el').value = product.short_description_el || '';
    document.getElementById('description_en').value = product.description_en;
    document.getElementById('description_el').value = product.description_el;
    document.getElementById('brand').value = product.brand;
    document.getElementById('category').value = product.category;
    document.getElementById('price').value = product.price;
    document.getElementById('stock').value = product.stock;
    document.getElementById('ingredients_en').value = product.ingredients_en || '';
    document.getElementById('ingredients_el').value = product.ingredients_el || '';
    document.getElementById('skin_type').value = product.skin_type;
    document.getElementById('featured').checked = product.featured == 1;
    document.getElementById('new_arrival').checked = product.new_arrival == 1;

    document.getElementById('product-form').dataset.productId = id;
    document.getElementById('product-form-title').textContent = t('edit_product');
    document.getElementById('product-form-modal').style.display = 'block';
  } catch (error) {
    console.error('Error loading product:', error);
  }
}

async function deleteProduct(id) {
  if (!confirm(t('are_you_sure'))) return;

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (response.ok) {
      alert(t('success_message'));
      loadProducts();
    }
  } catch (error) {
    console.error('Error deleting product:', error);
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const formData = new FormData();
  
  formData.append('name_en', document.getElementById('name_en').value);
  formData.append('name_el', document.getElementById('name_el').value);
  formData.append('short_description_en', document.getElementById('short_description_en').value);
  formData.append('short_description_el', document.getElementById('short_description_el').value);
  formData.append('description_en', document.getElementById('description_en').value);
  formData.append('description_el', document.getElementById('description_el').value);
  formData.append('brand', document.getElementById('brand').value);
  formData.append('category', document.getElementById('category').value);
  formData.append('price', document.getElementById('price').value);
  formData.append('stock', document.getElementById('stock').value);
  formData.append('ingredients_en', document.getElementById('ingredients_en').value);
  formData.append('ingredients_el', document.getElementById('ingredients_el').value);
  formData.append('skin_type', document.getElementById('skin_type').value);
  formData.append('featured', document.getElementById('featured').checked ? '1' : '0');
  formData.append('new_arrival', document.getElementById('new_arrival').checked ? '1' : '0');

  const imageFile = document.getElementById('image').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const productId = e.target.dataset.productId;
  const url = productId ? `/api/products/${productId}` : '/api/products';
  const method = productId ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      const newProductId = productId || result.id;
      
      // Upload additional images
      const additionalImages = document.getElementById('additional-images').files;
      if (additionalImages.length > 0) {
        for (let i = 0; i < additionalImages.length; i++) {
          const imgFormData = new FormData();
          imgFormData.append('image', additionalImages[i]);
          
          await fetch(`/api/product/${newProductId}/images`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` },
            body: imgFormData
          });
        }
      }
      
      alert(t('success_message'));
      document.getElementById('product-form-modal').style.display = 'none';
      loadProducts();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function loadCoupons() {
  try {
    const response = await fetch('/api/coupons', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const coupons = await response.json();

    const tbody = document.querySelector('#coupons-table tbody');
    tbody.innerHTML = coupons.map(coupon => `
      <tr>
        <td>${coupon.code}</td>
        <td>${coupon.discount_type}</td>
        <td>${coupon.discount_value}</td>
        <td>${coupon.expiration_date || 'N/A'}</td>
        <td>${coupon.max_uses || 'Unlimited'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteCoupon(${coupon.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading coupons:', error);
  }
}

async function handleCouponSubmit(e) {
  e.preventDefault();

  try {
    const response = await fetch('/api/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        code: document.getElementById('coupon-code').value,
        discount_type: document.getElementById('coupon-type').value,
        discount_value: parseFloat(document.getElementById('coupon-value').value),
        expiration_date: document.getElementById('coupon-expiration').value,
        max_uses: parseInt(document.getElementById('coupon-max-uses').value) || null
      })
    });

    if (response.ok) {
      alert(t('success_message'));
      document.getElementById('coupon-form-modal').style.display = 'none';
      loadCoupons();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function deleteCoupon(id) {
  if (!confirm(t('are_you_sure'))) return;

  try {
    const response = await fetch(`/api/coupons/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (response.ok) {
      alert(t('success_message'));
      loadCoupons();
    }
  } catch (error) {
    console.error('Error deleting coupon:', error);
  }
}

async function loadShippingMethods() {
  try {
    const response = await fetch('/api/shipping-methods');
    const methods = await response.json();

    const tbody = document.querySelector('#shipping-table tbody');
    tbody.innerHTML = methods.map(method => `
      <tr>
        <td>${method.name}</td>
        <td>€${method.price.toFixed(2)}</td>
        <td>${method.estimated_days || 'N/A'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteShipping(${method.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading shipping methods:', error);
  }
}

async function handleShippingSubmit(e) {
  e.preventDefault();

  try {
    const response = await fetch('/api/shipping-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: document.getElementById('shipping-name').value,
        price: parseFloat(document.getElementById('shipping-price').value),
        estimated_days: parseInt(document.getElementById('shipping-days').value)
      })
    });

    if (response.ok) {
      alert(t('success_message'));
      document.getElementById('shipping-form-modal').style.display = 'none';
      loadShippingMethods();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function deleteShipping(id) {
  if (!confirm(t('are_you_sure'))) return;

  try {
    const response = await fetch(`/api/shipping-methods/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (response.ok) {
      alert(t('success_message'));
      loadShippingMethods();
    }
  } catch (error) {
    console.error('Error deleting shipping method:', error);
  }
}

async function loadOrders() {
  try {
    const response = await fetch('/api/orders', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const orders = await response.json();

    const tbody = document.querySelector('#orders-table tbody');
    tbody.innerHTML = orders.map(order => `
      <tr>
        <td>#${order.id}</td>
        <td>${order.first_name || ''} ${order.last_name || ''}</td>
        <td>${order.email}</td>
        <td>€${order.total.toFixed(2)}</td>
        <td>${order.status}</td>
        <td>${new Date(order.created_at).toLocaleDateString()}</td>
        <td>
          <button class="btn btn-sm" onclick="viewOrderDetails(${order.id})">View</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

function viewOrderDetails(orderId) {
  fetch('/api/orders/' + orderId, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  })
  .then(res => res.json())
  .then(order => {
    const details = `
Order #${order.id}
Name: ${order.first_name || ''} ${order.last_name || ''}
Email: ${order.email}
Phone: ${order.phone || 'N/A'}
Address: ${order.address || ''}, ${order.city || ''}, ${order.postal_code || ''}, ${order.country || ''}
Total: €${order.total.toFixed(2)}
Status: ${order.status}
Date: ${new Date(order.created_at).toLocaleDateString()}
    `;
    alert(details);
  });
}

async function loadSubscribers() {
  try {
    const response = await fetch('/api/newsletter-subscribers', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const subscribers = await response.json();

    const tbody = document.querySelector('#subscribers-table tbody');
    tbody.innerHTML = subscribers.map(subscriber => `
      <tr>
        <td>${subscriber.email}</td>
        <td>${new Date(subscriber.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading subscribers:', error);
  }
}

async function loadComplaints() {
  try {
    const response = await fetch('/api/complaints', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const complaints = await response.json();

    const tbody = document.querySelector('#complaints-table tbody');
    tbody.innerHTML = complaints.map(complaint => `
      <tr>
        <td>${complaint.id}</td>
        <td>${complaint.name}</td>
        <td>${complaint.email}</td>
        <td>${complaint.phone || '-'}</td>
        <td>${complaint.order_number || '-'}</td>
        <td>${complaint.subject}</td>
        <td>${complaint.message.substring(0, 50)}...</td>
        <td>
          <select onchange="updateComplaintStatus(${complaint.id}, this.value)">
            <option value="pending" ${complaint.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="reviewed" ${complaint.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
            <option value="resolved" ${complaint.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </td>
        <td>
          <button class="btn btn-sm" onclick="viewComplaint(${complaint.id})">View</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading complaints:', error);
  }
}

async function updateComplaintStatus(id, status) {
  try {
    await fetch(`/api/complaints/${id}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    alert('Complaint status updated');
  } catch (error) {
    console.error('Error updating complaint:', error);
  }
}

function viewComplaint(id) {
  alert(`View complaint #${id} details`);
}

async function generateProducts() {
  if (!confirm('This will generate 12 sample cosmetics products. Continue?')) return;

  try {
    const response = await fetch('/api/admin/generate-products', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (response.ok) {
      alert(t('success_message'));
      loadProducts();
    }
  } catch (error) {
    console.error('Error generating products:', error);
  }
}
