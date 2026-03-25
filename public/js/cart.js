class Cart {
  constructor() {
    this.items = this.loadCart();
    this.updateCartCount();
  }

  loadCart() {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  }

  saveCart() {
    localStorage.setItem('cart', JSON.stringify(this.items));
    this.updateCartCount();
  }

  addItem(product) {
    const existingItem = this.items.find(item => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += product.quantity || 1;
    } else {
      this.items.push({
        id: product.id,
        name_en: product.name_en,
        name_el: product.name_el,
        price: product.price,
        quantity: product.quantity || 1,
        image: product.image || 'default.jpg'
      });
    }
    
    this.saveCart();
  }

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.saveCart();
  }

  updateQuantity(productId, quantity) {
    const item = this.items.find(item => item.id === productId);
    if (item) {
      item.quantity = quantity;
      if (item.quantity <= 0) {
        this.removeItem(productId);
      } else {
        this.saveCart();
      }
    }
  }

  getTotal() {
    return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getItemCount() {
    return this.items.reduce((count, item) => count + item.quantity, 0);
  }

  clear() {
    this.items = [];
    this.saveCart();
  }

  updateCartCount() {
    const cartCountElements = document.querySelectorAll('#cart-count');
    const count = this.getItemCount();
    cartCountElements.forEach(el => {
      el.textContent = count;
    });
  }
}

const cart = new Cart();

async function addToCart(productId) {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    const product = products.find(p => p.id === productId);
    
    if (product) {
      cart.addItem(product);
      console.log('Product added to cart');
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cart.updateCartCount();
});
