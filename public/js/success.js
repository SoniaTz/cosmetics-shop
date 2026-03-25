document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  if (sessionId) {
    const checkoutData = JSON.parse(localStorage.getItem('checkoutData') || '{}');
    
    try {
      // Process payment
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          ...checkoutData
        })
      });

      if (response.ok) {
        const { orderId } = await response.json();
        document.getElementById('order-id').textContent = orderId;
        
        // Clear cart and local storage
        cart.clear();
        localStorage.removeItem('checkoutData');
        localStorage.removeItem('appliedCoupon');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
    }
  }
});
