// User Account Handler and Admin Access
document.addEventListener('DOMContentLoaded', () => {
  const accountBtn = document.getElementById('account-btn');
  const accountModal = document.getElementById('account-modal');
  const closeAccountModal = document.getElementById('close-account-modal');
  const userLoginForm = document.getElementById('user-login-form');
  const userRegisterForm = document.getElementById('user-register-form');
  const accountLoginForm = document.getElementById('account-login-form');
  const accountRegisterForm = document.getElementById('account-register-form');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');

  // Open account modal
  if (accountBtn) {
    accountBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (accountModal) {
        accountModal.style.display = 'block';
      }
    });
  }

  // Close modal
  if (closeAccountModal) {
    closeAccountModal.addEventListener('click', () => {
      if (accountModal) {
        accountModal.style.display = 'none';
      }
    });
  }

  // Toggle between login and register
  if (showRegister) {
    showRegister.addEventListener('click', (e) => {
      e.preventDefault();
      accountLoginForm.style.display = 'none';
      accountRegisterForm.style.display = 'block';
    });
  }

  if (showLogin) {
    showLogin.addEventListener('click', (e) => {
      e.preventDefault();
      accountRegisterForm.style.display = 'none';
      accountLoginForm.style.display = 'block';
    });
  }

  // Handle user login
  if (userLoginForm) {
    userLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('user-email').value;
      const password = document.getElementById('user-password').value;

      try {
        const response = await fetch('/api/user/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        if (response.ok) {
          const { token } = await response.json();
          localStorage.setItem('userToken', token);
          localStorage.setItem('userEmail', email);
          alert(typeof t === 'function' ? t('success_message') : 'Login successful!');
          accountModal.style.display = 'none';
          updateAccountUI();
        } else {
          alert(typeof t === 'function' ? t('invalid_credentials') : 'Invalid email or password');
        }
      } catch (error) {
        console.error('Login error:', error);
        alert(typeof t === 'function' ? t('error_message') : 'Error logging in');
      }
    });
  }

  // Handle user registration
  if (userRegisterForm) {
    userRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('user-name').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;

      try {
        const response = await fetch('/api/user/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        if (response.ok) {
          alert('Registration successful! Please login.');
          userRegisterForm.style.display = 'none';
          userLoginForm.style.display = 'block';
          accountRegisterForm.style.display = 'none';
          accountLoginForm.style.display = 'block';
          document.getElementById('register-email').value = email;
        } else {
          const error = await response.json();
          alert(error.error || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        alert(typeof t === 'function' ? t('error_message') : 'Error registering');
      }
    });
  }

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (accountModal && e.target === accountModal) {
      accountModal.style.display = 'none';
    }
  });

  updateAccountUI();
});

function updateAccountUI() {
  const userToken = localStorage.getItem('userToken');
  const accountBtn = document.getElementById('account-btn');
  
  if (userToken && accountBtn) {
    // Decode token to get email
    try {
      const decoded = atob(userToken);
      const email = decoded.split(':')[0];
      
      // Get user name
      fetch('/api/user/by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).then(res => res.json())
      .then(user => {
        if (user && user.name) {
          // Replace the account button with a user dropdown
          accountBtn.outerHTML = `
            <li class="user-dropdown">
              <a href="#" class="user-name-btn"><i class="fa-solid fa-circle-user"></i> ${user.name}</a>
              <ul class="dropdown-menu">
                <li><a href="/profile" id="profile-btn">Profile</a></li>
                <li><a href="#" id="logout-btn">LogOut</a></li>
                <li><a href="#" id="delete-account-btn" style="color: red;">Delete Account</a></li>
              </ul>
            </li>`;
          
          // Add event listeners
          document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userToken');
            localStorage.removeItem('userEmail');
            location.reload();
          });
          
          document.getElementById('delete-account-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
              try {
                const response = await fetch('/api/user/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
                });
                if (response.ok) {
                  localStorage.removeItem('userToken');
                  localStorage.removeItem('userEmail');
                  alert('Account deleted successfully');
                  location.reload();
                } else {
                  alert('Failed to delete account');
                }
              } catch (err) {
                alert('Error deleting account');
              }
            }
          });
        }
      });
    } catch (e) {
      console.log('Error decoding user token');
    }
  }
}

// Admin access: Check if admin is trying to access /admin.html
function checkAdminAccess() {
  if (window.location.pathname === '/admin.html' || window.location.pathname === '/admin') {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      // Show admin login
      const adminLoginHTML = `
        <div id="admin-access-modal" class="modal" style="display: block; z-index: 10000;">
          <div class="modal-content" style="background-color: #fff; padding: 30px; border-radius: 8px;">
            <h2>Admin Access</h2>
            <form id="admin-access-form">
              <div class="form-group">
                <label>Username</label>
                <input type="text" id="admin-username" required>
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" id="admin-password" required>
              </div>
              <button type="submit" class="btn btn-primary btn-full">Login</button>
            </form>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('afterbegin', adminLoginHTML);
      
      document.getElementById('admin-access-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        try {
          const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          if (response.ok) {
            const { token } = await response.json();
            localStorage.setItem('adminToken', token);
            location.reload();
          } else {
            alert('Invalid admin credentials');
          }
        } catch (error) {
          console.error('Admin login error:', error);
        }
      });
    }
  }
}

// Call on page load
checkAdminAccess();
