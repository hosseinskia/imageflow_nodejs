document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorDiv = document.getElementById('error');
  
    if (error) {
      if (error === 'invalid') {
        errorDiv.textContent = 'Invalid username or password.';
      } else if (error === 'missing') {
        errorDiv.textContent = 'Please enter both username and password.';
      } else if (error === 'server') {
        errorDiv.textContent = 'Server error, please try again later.';
      } else if (error === 'ratelimit') {
        errorDiv.textContent = 'Too many login attempts. Please wait 1 minute.';
      }
      // Clear the query parameter from the URL
      window.history.replaceState({}, document.title, '/login');
    }
  });