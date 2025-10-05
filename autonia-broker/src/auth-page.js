// auth-page.js - HTML pages for authentication
import { supabase } from "./supabase.js";

/**
 * Login/Signup page HTML
 */
export function getAuthPage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Autonia Login</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 420px;
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }

    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .header p {
      font-size: 16px;
      opacity: 0.9;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid #e2e8f0;
    }

    .tab {
      flex: 1;
      padding: 20px;
      text-align: center;
      background: none;
      border: none;
      font-size: 16px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.3s;
      border-bottom: 3px solid transparent;
    }

    .tab:hover {
      color: #667eea;
      background: #f8fafc;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .form-container {
      padding: 30px;
    }

    .form {
      display: none;
    }

    .form.active {
      display: block;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #334155;
      font-size: 14px;
    }

    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s;
    }

    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 10px;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .error {
      background: #fee2e2;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
    }

    .error.show {
      display: block;
    }

    .success {
      background: #d1fae5;
      color: #059669;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
    }

    .success.show {
      display: block;
    }

    .loading {
      display: none;
      text-align: center;
      padding: 20px;
    }

    .loading.show {
      display: block;
    }

    .spinner {
      border: 3px solid #e2e8f0;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .footer {
      text-align: center;
      padding: 20px;
      color: #64748b;
      font-size: 14px;
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Autonia</h1>
      <p>Deploy and manage your AI Agents</p>
    </div>

    <div class="tabs">
      <button class="tab active" onclick="switchTab('login')">Login</button>
      <button class="tab" onclick="switchTab('signup')">Sign Up</button>
    </div>

    <div class="form-container">
      <div class="error" id="error"></div>
      <div class="success" id="success"></div>
      
      <div class="loading" id="loading">
        <div class="spinner"></div>
        <p>Authenticating...</p>
      </div>

      <!-- Login Form -->
      <form id="login-form" class="form active" onsubmit="handleLogin(event)">
        <div class="form-group">
          <label for="login-email">Email</label>
          <input type="email" id="login-email" required placeholder="you@example.com">
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" required placeholder="••••••••">
        </div>
        <button type="submit" class="btn">Login</button>
      </form>

      <!-- Signup Form -->
      <form id="signup-form" class="form" onsubmit="handleSignup(event)">
        <div class="form-group">
          <label for="signup-email">Email</label>
          <input type="email" id="signup-email" required placeholder="you@example.com">
        </div>
        <div class="form-group">
          <label for="signup-password">Password</label>
          <input type="password" id="signup-password" required placeholder="••••••••" minlength="6">
        </div>
        <div class="form-group">
          <label for="signup-confirm">Confirm Password</label>
          <input type="password" id="signup-confirm" required placeholder="••••••••" minlength="6">
        </div>
        <button type="submit" class="btn">Create Account</button>
      </form>
    </div>

    <div class="footer">
      Powered by Autonia
    </div>
  </div>

  <script>
    // Get redirect URL from query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect') || 'http://localhost:54321/callback';

    function switchTab(tab) {
      // Update tabs
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      
      // Update forms
      document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
      document.getElementById(tab + '-form').classList.add('active');
      
      // Clear messages
      hideError();
      hideSuccess();
    }

    function showError(message) {
      const errorEl = document.getElementById('error');
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }

    function hideError() {
      document.getElementById('error').classList.remove('show');
    }

    function showSuccess(message) {
      const successEl = document.getElementById('success');
      successEl.textContent = message;
      successEl.classList.add('show');
    }

    function hideSuccess() {
      document.getElementById('success').classList.remove('show');
    }

    function showLoading() {
      document.getElementById('loading').classList.add('show');
      document.querySelectorAll('.form').forEach(f => f.style.display = 'none');
    }

    function hideLoading() {
      document.getElementById('loading').classList.remove('show');
      document.querySelectorAll('.form.active').forEach(f => f.style.display = 'block');
    }

    async function handleLogin(event) {
      event.preventDefault();
      hideError();
      showLoading();

      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const response = await fetch('/auth/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        // Redirect to CLI with tokens
        window.location.href = redirectUrl + 
          '?access_token=' + encodeURIComponent(data.access_token) + 
          '&refresh_token=' + encodeURIComponent(data.refresh_token);
      } catch (error) {
        hideLoading();
        showError(error.message || 'Login failed. Please try again.');
      }
    }

    async function handleSignup(event) {
      event.preventDefault();
      hideError();
      
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;

      if (password !== confirm) {
        showError('Passwords do not match');
        return;
      }

      showLoading();

      try {
        const response = await fetch('/auth/api/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Signup failed');
        }

        if (data.access_token && data.refresh_token) {
          // Auto-login after signup
          window.location.href = redirectUrl + 
            '?access_token=' + encodeURIComponent(data.access_token) + 
            '&refresh_token=' + encodeURIComponent(data.refresh_token);
        } else if (data.confirmation_required) {
          // Email confirmation required
          hideLoading();
          showSuccess(data.message || 'Account created! Please check your email to confirm your account, then login.');
          setTimeout(() => switchTab('login'), 3000);
        }
      } catch (error) {
        hideLoading();
        showError(error.message || 'Signup failed. Please try again.');
      }
    }
  </script>
</body>
</html>
  `;
}

/**
 * Success page after authentication
 */
export function getSuccessPage(email) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authentication Successful</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      padding: 60px 40px;
      text-align: center;
      max-width: 500px;
    }

    .checkmark {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      animation: scaleIn 0.5s ease-out;
    }

    .checkmark::after {
      content: '✓';
      color: white;
      font-size: 48px;
      font-weight: bold;
    }

    @keyframes scaleIn {
      0% {
        transform: scale(0);
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
      }
    }

    h1 {
      font-size: 32px;
      color: #1e293b;
      margin-bottom: 16px;
    }

    .email {
      font-size: 18px;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 24px;
    }

    p {
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
    }

    .footer {
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark"></div>
    <h1>✅ Authentication Successful!</h1>
    <div class="email">Logged in as: ${email}</div>
    <p>You can close this window and return to the terminal.</p>
    <div class="footer">
      Window will close automatically in 3 seconds...
    </div>
  </div>

  <script>
    setTimeout(() => {
      window.close();
    }, 3000);
  </script>
</body>
</html>
  `;
}
