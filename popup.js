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
  
  // New elements for role activation
  const durationSlider = document.getElementById('duration-slider');
  const durationValue = document.getElementById('duration-value');
  const justificationText = document.getElementById('justification-text');
  const ticketSystem = document.getElementById('ticket-system');
  const ticketNumber = document.getElementById('ticket-number');
  
  // Add activation button element
  const activateButton = document.getElementById('activate-button');
  
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
  
  // Slider event listener
  durationSlider.addEventListener('input', function() {
    durationValue.textContent = durationSlider.value;
  });
  
  // Add activation button event listener
  activateButton.addEventListener('click', function() {
    const selectedRoles = getSelectedRoles();
    const duration = parseFloat(durationSlider.value);
    const justification = justificationText.value.trim();
    const ticketSystemValue = ticketSystem.value.trim();
    const ticketNumberValue = ticketNumber.value.trim();
    
    if (selectedRoles.length === 0) {
      showError('Please select at least one role to activate');
      return;
    }
    
    if (!justification) {
      showError('Please enter a justification');
      return;
    }
    
    if (duration <= 0) {
      showError('Please select a duration greater than 0');
      return;
    }
    
    statusMessage.textContent = 'Activating roles...';
    activateButton.disabled = true;
    
    // Get token from storage
    chrome.storage.local.get(['graphToken'], function(data) {
      const token = data.graphToken;
      
      if (!token) {
        showError('No valid token found');
        activateButton.disabled = false;
        return;
      }
      
      // Prepare ticket information
      const ticketInfo = {};
      if (ticketSystemValue) ticketInfo.ticketSystem = ticketSystemValue;
      if (ticketNumberValue) ticketInfo.ticketNumber = ticketNumberValue;
      
      // Call the activation function
      activatePimRoles(selectedRoles, duration, justification, token, ticketInfo)
        .then(result => {
          if (result.success) {
            statusMessage.textContent = 'Roles activated successfully';
            
            // Show success message
            const successMessage = `Successfully activated ${result.results.length} role(s)`;
            alert(successMessage);
            
            // Reset form
            justificationText.value = '';
            ticketSystem.value = '';
            ticketNumber.value = '';
            
            // Uncheck all checkboxes
            document.querySelectorAll('.role-checkbox:checked').forEach(cb => {
              cb.checked = false;
              // Also update storage
              const roleId = cb.id.replace('-checkbox', '');
              const saveObj = {};
              saveObj[`${roleId}-checked`] = false;
              chrome.storage.local.set(saveObj);
            });
          } else {
            showError(`Failed to activate some roles: ${result.errors.map(e => e.role).join(', ')}`);
          }
          
          activateButton.disabled = false;
        })
        .catch(error => {
          showError(`Activation error: ${error.message}`);
          activateButton.disabled = false;
        });
    });
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
        roleElement.className = 'role-item compact';
        
        // Store role data in dataset for later use in activation
        roleElement.dataset.roleDefinitionId = role.roleDefinitionId || '';
        roleElement.dataset.principalId = role.principalId || '';
        roleElement.dataset.directoryScopeId = role.directoryScopeId || '/';
        
        // Use the resolved friendly name if available, otherwise fallback to other properties
        const roleName = role.roleName || role.roleDefinitionDisplayName || 
                          role.roleDefinitionId || 'Unknown Role';
        
        // Create a unique ID for the role based on its definition ID
        const roleId = role.roleDefinitionId ? `role-${role.roleDefinitionId.replace(/[-]/g, '')}` : `role-${Math.random().toString(36).substr(2, 9)}`;
        
        roleElement.innerHTML = `
          <div class="role-flex-container">
            <input type="checkbox" id="${roleId}-checkbox" class="role-checkbox">
            <div class="role-title">${escapeHTML(roleName)}</div>
          </div>
        `;
        
        rolesList.appendChild(roleElement);
        
        // Set up checkbox event listener
        const checkbox = document.getElementById(`${roleId}-checkbox`);
        
        // Load saved checkbox state if available
        chrome.storage.local.get([`${roleId}-checked`], function(result) {
          if (result[`${roleId}-checked`]) {
            checkbox.checked = true;
          }
        });
        
        // Save checkbox state when changed
        checkbox.addEventListener('change', function() {
          const saveObj = {};
          saveObj[`${roleId}-checked`] = checkbox.checked;
          chrome.storage.local.set(saveObj);
        });
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
  
  // Function to gather selected roles with their data
  function getSelectedRoles() {
    const selectedRoles = [];
    
    document.querySelectorAll('.role-checkbox:checked').forEach(checkbox => {
      const roleItem = checkbox.closest('.role-item');
      if (roleItem) {
        selectedRoles.push({
          roleDefinitionId: roleItem.dataset.roleDefinitionId,
          principalId: roleItem.dataset.principalId,
          directoryScopeId: roleItem.dataset.directoryScopeId || "/",
          roleName: roleItem.querySelector('.role-title').textContent
        });
      }
    });
    
    return selectedRoles;
  }
});
