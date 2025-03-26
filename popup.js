document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const statusMessage = document.getElementById('status-message');
  const refreshButton = document.getElementById('refresh-button');
  const tokenStatus = document.getElementById('token-status');
  const noTokenView = document.getElementById('no-token-view');
  const rolesContainer = document.getElementById('roles-container');
  const rolesList = document.getElementById('roles-list');
  const errorContainer = document.getElementById('error-container');
  const errorDetails = document.getElementById('error-details');
  const manualTokenInput = document.getElementById('manual-token');
  const saveTokenButton = document.getElementById('save-token-button');
  const clearTokenButton = document.getElementById('clear-token-button');
  
  // Initialize by checking token status and loading roles if token exists
  init();
  
  // Setup event listeners
  refreshButton.addEventListener('click', init);
  
  saveTokenButton.addEventListener('click', function() {
    const token = manualTokenInput.value.trim();
    if (token) {
      statusMessage.textContent = 'Saving token...';
      chrome.runtime.sendMessage(
        { action: 'manualSetToken', token: token },
        function(response) {
          if (response && response.success) {
            manualTokenInput.value = '';
            init(); // Refresh the UI
          } else {
            showError(response?.error || 'Failed to save token');
          }
        }
      );
    }
  });
  
  clearTokenButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'clearToken' }, function(response) {
      if (response && response.success) {
        init(); // Refresh the UI
      }
    });
  });
  
  // Open links in new tabs
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' && e.target.getAttribute('target') === '_blank') {
      e.preventDefault();
      chrome.tabs.create({ url: e.target.href });
    }
  });
  
  // Main initialization function
  function init() {
    statusMessage.textContent = 'Checking token...';
    
    // Hide all dynamic content sections
    noTokenView.classList.add('hidden');
    rolesContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    
    // Check if we have a valid token
    chrome.runtime.sendMessage({ action: 'getTokenStatus' }, function(response) {
      if (response && response.success) {
        updateTokenStatus(response.status);
        
        if (response.status.hasToken && !response.status.isExpired) {
          loadRoles();
        } else {
          noTokenView.classList.remove('hidden');
          statusMessage.textContent = 'No valid token';
        }
      } else {
        showError(response?.error || 'Failed to check token status');
      }
    });
  }
  
  // Update token status display
  function updateTokenStatus(status) {
    if (status.hasToken) {
      if (status.isExpired) {
        tokenStatus.innerHTML = `
          <p class="warning">⚠️ Token expired (${status.tokenAge} min old)</p>
          <p>Please refresh your Microsoft session and try again.</p>
        `;
        tokenStatus.className = 'info-box warning';
      } else {
        tokenStatus.innerHTML = `
          <p class="success">✓ Valid token found (${status.tokenAge} min old)</p>
          <p class="token-source">Source: ${escapeHTML(status.source || 'Unknown')}</p>
        `;
        tokenStatus.className = 'info-box success';
      }
    } else {
      tokenStatus.innerHTML = `
        <p class="notice">No token found</p>
        <p>Sign in to a Microsoft service first.</p>
      `;
      tokenStatus.className = 'info-box notice';
    }
  }
  
  // Load and display PIM roles
  function loadRoles() {
    statusMessage.textContent = 'Loading roles...';
    
    chrome.runtime.sendMessage({ action: 'getPimRoles' }, function(response) {
      if (response && response.success) {
        displayRoles(response.data);
        statusMessage.textContent = 'Roles loaded';
      } else {
        showError(response?.error || 'Failed to load roles');
      }
    });
  }
  
  // Display roles in the popup
  function displayRoles(data) {
    rolesList.innerHTML = '';
    
    if (!data.value || data.value.length === 0) {
      rolesList.innerHTML = '<p class="no-roles">No eligible PIM roles found for your account.</p>';
    } else {
      data.value.forEach(role => {
        const roleElement = document.createElement('div');
        roleElement.className = 'role-item';
        
        // Find the best display name for the role
        const roleName = role.roleName || role.roleDefinitionDisplayName || 
                          role.roleDefinitionId || 'Unknown Role';
        
        roleElement.innerHTML = `
          <div class="role-title">${escapeHTML(roleName)}</div>
          <div class="role-details">
            <div><strong>Status:</strong> ${escapeHTML(role.status || 'Unknown')}</div>
            <div><strong>Role ID:</strong> ${escapeHTML(role.roleDefinitionId || 'Unknown')}</div>
            ${role.principalId ? `<div><strong>Principal ID:</strong> ${escapeHTML(role.principalId)}</div>` : ''}
            ${role.scheduleInfo ? `<div><strong>Duration:</strong> ${escapeHTML(role.scheduleInfo.expiration?.duration || 'Not specified')}</div>` : ''}
          </div>
        `;
        
        rolesList.appendChild(roleElement);
      });
    }
    
    rolesContainer.classList.remove('hidden');
  }
  
  // Show an error message
  function showError(message) {
    errorDetails.textContent = message;
    errorContainer.classList.remove('hidden');
    statusMessage.textContent = 'Error';
  }
  
  // Helper function to safely escape HTML
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
