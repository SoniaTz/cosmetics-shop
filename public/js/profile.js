document.addEventListener('DOMContentLoaded', async () => {
    const userToken = localStorage.getItem('userToken');
    
    if (!userToken) {
        // Not logged in, redirect to home or show message
        document.querySelector('.profile-container').innerHTML = `
            <div class="login-required">
                <i class="fa-solid fa-lock"></i>
                <p>Please log in to view your profile.</p>
                <a href="/" class="btn btn-primary">Go to Home</a>
            </div>
        `;
        return;
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
            displayProfileInfo(user);
        }
        
        // Load order history
        loadOrderHistory(email);
        
        // Load wishlist preview
        loadWishlistPreview();
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
});

function displayProfileInfo(user) {
    document.getElementById('profile-name').textContent = user.name || 'Not set';
    document.getElementById('profile-email').textContent = user.email || 'Not set';
    document.getElementById('profile-created').textContent = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';
    
    // Display delivery information
    document.getElementById('delivery-first-name').textContent = user.first_name || 'Not set';
    document.getElementById('delivery-last-name').textContent = user.last_name || 'Not set';
    document.getElementById('delivery-address').textContent = user.address || 'Not set';
    document.getElementById('delivery-city').textContent = user.city || 'Not set';
    document.getElementById('delivery-postal-code').textContent = user.postal_code || 'Not set';
    document.getElementById('delivery-country').textContent = user.country || 'Not set';
    document.getElementById('delivery-phone').textContent = user.phone || 'Not set';
    
    // Store user data for editing
    window.currentUser = user;
}

async function loadOrderHistory(email) {
    const orderHistoryDiv = document.getElementById('order-history');
    
    try {
        const response = await fetch('/api/orders/user', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ email })
        });
        
        if (response.ok) {
            const orders = await response.json();
            
            if (orders.length === 0) {
                orderHistoryDiv.innerHTML = '<p class="no-data">No orders yet</p>';
                return;
            }
            
            orderHistoryDiv.innerHTML = orders.map(order => `
                <div class="order-item">
                    <div class="order-header">
                        <span class="order-id">Order #${order.id}</span>
                        <span class="order-date">${new Date(order.created_at).toLocaleDateString()}</span>
                        <span class="order-status status-${order.status}">${order.status}</span>
                    </div>
                    <div class="order-details">
                        <p><strong>Total:</strong> €${order.total.toFixed(2)}</p>
                        <p><strong>Items:</strong> ${order.items_count}</p>
                    </div>
                    <a href="/order/${order.id}" class="btn btn-sm btn-outline">View Details</a>
                </div>
            `).join('');
        } else {
            orderHistoryDiv.innerHTML = '<p class="no-data">No orders found</p>';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        orderHistoryDiv.innerHTML = '<p class="error">Error loading orders</p>';
    }
}

function loadWishlistPreview() {
    const wishlistPreview = document.getElementById('wishlist-preview');
    const wishlist = getWishlist();
    
    if (wishlist.length === 0) {
        wishlistPreview.innerHTML = '<p class="no-data">' + (currentLanguage === 'en' ? 'Your wishlist is empty' : 'Η λίστα επιθυμιών σας είναι κενή') + '</p>';
        return;
    }
    
    // Fetch wishlist products
    fetch('/products.json')
        .then(res => res.json())
        .then(products => {
            const wishlistProducts = products.filter(p => wishlist.includes(p.id)).slice(0, 4);
            
            if (wishlistProducts.length === 0) {
                wishlistPreview.innerHTML = '<p class="no-data">' + (currentLanguage === 'en' ? 'Your wishlist is empty' : 'Η λίστα επιθυμιών σας είναι κενή') + '</p>';
                return;
            }
            
            wishlistPreview.innerHTML = `
                <div class="wishlist-products-grid">
                    ${wishlistProducts.map(product => `
                        <div class="wishlist-product-card" onclick="window.location.href='/${currentLanguage === 'el' ? 'el/' : ''}product/${product.id}'">
                            <img src="/images/${product.image}" alt="${product.name_en}" onerror="this.src='/images/default.jpg'">
                            <div class="wishlist-product-info">
                                <h4>${currentLanguage === 'en' ? product.name_en : product.name_el}</h4>
                                <p class="price">€${product.price.toFixed(2)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        })
        .catch(error => {
            console.error('Error loading wishlist:', error);
            wishlistPreview.innerHTML = '<p class="error">Error loading wishlist</p>';
        });
}

function editField(field) {
    const user = window.currentUser;
    if (!user) return;
    
    document.getElementById('profile-info-section').style.display = 'none';
    document.getElementById('edit-profile-section').style.display = 'block';
    
    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-email').value = user.email || '';
}

function cancelEdit() {
    document.getElementById('edit-profile-section').style.display = 'none';
    document.getElementById('profile-info-section').style.display = 'block';
}

function editDeliveryInfo() {
    const user = window.currentUser;
    if (!user) return;
    
    document.getElementById('delivery-info-section').style.display = 'none';
    document.getElementById('edit-delivery-section').style.display = 'block';
    
    document.getElementById('edit-delivery-first-name').value = user.first_name || '';
    document.getElementById('edit-delivery-last-name').value = user.last_name || '';
    document.getElementById('edit-delivery-address').value = user.address || '';
    document.getElementById('edit-delivery-city').value = user.city || '';
    document.getElementById('edit-delivery-postal-code').value = user.postal_code || '';
    document.getElementById('edit-delivery-country').value = user.country || '';
    document.getElementById('edit-delivery-phone').value = user.phone || '';
}

function cancelDeliveryEdit() {
    document.getElementById('edit-delivery-section').style.display = 'none';
    document.getElementById('delivery-info-section').style.display = 'block';
}

// Handle profile form submission
document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newName = document.getElementById('edit-name').value;
    const newPassword = document.getElementById('edit-password').value;
    const email = window.currentUser.email;
    
    try {
        const response = await fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                name: newName,
                password: newPassword || null
            })
        });
        
        if (response.ok) {
            alert('Profile updated successfully!');
            window.currentUser.name = newName;
            displayProfileInfo(window.currentUser);
            cancelEdit();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile');
    }
});

// Handle delivery info form submission
document.getElementById('edit-delivery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = window.currentUser.email;
    const firstName = document.getElementById('edit-delivery-first-name').value;
    const lastName = document.getElementById('edit-delivery-last-name').value;
    const address = document.getElementById('edit-delivery-address').value;
    const city = document.getElementById('edit-delivery-city').value;
    const postalCode = document.getElementById('edit-delivery-postal-code').value;
    const country = document.getElementById('edit-delivery-country').value;
    const phone = document.getElementById('edit-delivery-phone').value;
    
    try {
        const response = await fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                first_name: firstName,
                last_name: lastName,
                address,
                city,
                postal_code: postalCode,
                country,
                phone
            })
        });
        
        if (response.ok) {
            alert('Delivery information updated successfully!');
            window.currentUser.first_name = firstName;
            window.currentUser.last_name = lastName;
            window.currentUser.address = address;
            window.currentUser.city = city;
            window.currentUser.postal_code = postalCode;
            window.currentUser.country = country;
            window.currentUser.phone = phone;
            displayProfileInfo(window.currentUser);
            cancelDeliveryEdit();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to update delivery information');
        }
    } catch (error) {
        console.error('Error updating delivery info:', error);
        alert('Error updating delivery information');
    }
});

function toggleNewsletter() {
    const status = document.getElementById('newsletter-status');
    if (status.textContent === 'Off') {
        status.textContent = 'On';
        status.classList.add('active');
    } else {
        status.textContent = 'Off';
        status.classList.remove('active');
    }
}

function confirmDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        const email = window.currentUser.email;
        
        fetch('/api/user/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(res => res.json())
        .then(data => {
            alert('Account deleted successfully');
            localStorage.removeItem('userToken');
            localStorage.removeItem('userEmail');
            window.location.href = '/';
        })
        .catch(error => {
            console.error('Error deleting account:', error);
            alert('Error deleting account');
        });
    }
}