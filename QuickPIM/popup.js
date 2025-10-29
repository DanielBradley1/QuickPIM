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

  // Search and filter elements
  const roleSearch = document.getElementById('role-search');
  const clearSearchBtn = document.getElementById('clear-search');
  const searchResultsCount = document.getElementById('search-results-count');
  const filterChips = document.querySelectorAll('.filter-chip');

  // Tab navigation elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const activeRolesContainer = document.getElementById('active-roles-container');
  const activeRolesList = document.getElementById('active-roles-list');

  // State for search and filter
  let currentSearchTerm = '';
  let currentFilter = 'all';
  let currentTab = 'eligible';
  let activeRolesInterval = null;

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

  // Search input event listener
  roleSearch.addEventListener('input', function(e) {
    currentSearchTerm = e.target.value.toLowerCase().trim();

    // Show/hide clear button
    if (currentSearchTerm) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }

    filterRoles();
  });

  // Clear search button
  clearSearchBtn.addEventListener('click', function() {
    roleSearch.value = '';
    currentSearchTerm = '';
    clearSearchBtn.classList.add('hidden');
    filterRoles();
    roleSearch.focus();
  });

  // Filter chip event listeners
  filterChips.forEach(chip => {
    chip.addEventListener('click', function() {
      // Remove active class from all chips
      filterChips.forEach(c => c.classList.remove('active'));

      // Add active class to clicked chip
      this.classList.add('active');

      // Update current filter
      currentFilter = this.dataset.filter;

      filterRoles();
    });
  });

  // Keyboard shortcut: Ctrl+F to focus search
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      roleSearch.focus();
      roleSearch.select();
    }
  });

  // Tab switching event listeners
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetTab = this.dataset.tab;
      switchTab(targetTab);
    });
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

    // Get both tokens from storage
    chrome.storage.local.get(['graphToken', 'azureManagementToken'], function(data) {
      const graphToken = data.graphToken;
      const azureManagementToken = data.azureManagementToken;

      // Check which types of roles are selected
      const hasDirectoryRoles = selectedRoles.some(r => r.roleType !== 'azureResource');
      const hasAzureResourceRoles = selectedRoles.some(r => r.roleType === 'azureResource');

      // Validate tokens based on selected roles
      if (hasDirectoryRoles && !graphToken) {
        showError('No Graph API token found for Entra ID roles. Please visit Microsoft Entra portal first.');
        activateButton.disabled = false;
        return;
      }

      if (hasAzureResourceRoles && !azureManagementToken) {
        showError('No Azure Management token found for Azure resource roles. Please visit Azure Portal first.');
        activateButton.disabled = false;
        return;
      }

      // Prepare ticket information
      const ticketInfo = {};
      if (ticketSystemValue) ticketInfo.ticketSystem = ticketSystemValue;
      if (ticketNumberValue) ticketInfo.ticketNumber = ticketNumberValue;

      // Call the unified activation function
      activateAllRoles(selectedRoles, duration, justification, graphToken, azureManagementToken, ticketInfo)
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
            showError(`Failed to activate some roles: ${result.errors.map(e => `${e.role}${e.scope ? ` (${e.scope})` : ''}`).join(', ')}`);
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
    activeRolesContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');
    
    // Check if we have a valid token
    chrome.runtime.sendMessage({ action: 'getTokenStatus' }, function(response) {
      if (response && response.success) {
        updateTokenStatus(response.status);
        
        if (response.status.hasToken && !response.status.isExpired) {
          // Load content based on current tab
          if (currentTab === 'active') {
            activeRolesContainer.classList.remove('hidden');
            loadActiveRoles();
          } else {
            rolesContainer.classList.remove('hidden');
            loadRoles();
          }
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
  
  // Load and display PIM roles (both directory and Azure resource roles)
  function loadRoles() {
    statusMessage.textContent = 'Loading roles...';

    chrome.runtime.sendMessage({ action: 'getAllRoles' }, function(response) {
      if (response && response.success) {
        displayAllRoles(response.data);
        statusMessage.textContent = 'Roles loaded';
      } else {
        showError(response?.error || 'Failed to load roles');
      }
    });
  }
  
  // Display all roles (both directory and Azure resource roles)
  function displayAllRoles(data) {
    rolesList.innerHTML = '';

    const directoryRoles = data.directoryRoles?.value || [];
    const azureResourceRoles = data.azureResourceRoles?.value || [];
    const errors = data.errors || [];

    // Display errors if any
    if (errors.length > 0) {
      const errorSection = document.createElement('div');
      errorSection.className = 'warning-section';
      errorSection.innerHTML = '<p><strong>⚠️ Some roles could not be loaded:</strong></p>';
      errors.forEach(err => {
        const errorMsg = document.createElement('p');
        errorMsg.className = 'error-message';
        errorMsg.textContent = `${err.type}: ${err.error}`;
        errorSection.appendChild(errorMsg);
      });
      rolesList.appendChild(errorSection);
    }

    // Check if we have any roles
    if (directoryRoles.length === 0 && azureResourceRoles.length === 0) {
      rolesList.innerHTML += '<p class="no-roles">No eligible PIM roles found for your account.</p>';
      rolesContainer.classList.remove('hidden');
      return;
    }

    // Display Directory Roles section
    if (directoryRoles.length > 0) {
      const directorySection = document.createElement('div');
      directorySection.className = 'role-section';
      directorySection.innerHTML = '<h3 class="role-section-title">🔐 Entra ID Roles</h3>';

      directoryRoles.forEach(role => {
        const roleElement = createRoleElement(role, 'directory');
        directorySection.appendChild(roleElement);
      });

      rolesList.appendChild(directorySection);
    }

    // Display Azure Resource Roles section
    if (azureResourceRoles.length > 0) {
      const azureSection = document.createElement('div');
      azureSection.className = 'role-section';
      azureSection.innerHTML = '<h3 class="role-section-title">☁️ Azure Resource Roles</h3>';

      azureResourceRoles.forEach(role => {
        const roleElement = createRoleElement(role, 'azureResource');
        azureSection.appendChild(roleElement);
      });

      rolesList.appendChild(azureSection);
    }

    rolesContainer.classList.remove('hidden');
  }

  // Helper function to create a role element
  function createRoleElement(role, roleType) {
    const roleElement = document.createElement('div');
    roleElement.className = 'role-item compact';

    // Store role data in dataset for later use in activation
    if (roleType === 'directory') {
      roleElement.dataset.roleDefinitionId = role.roleDefinitionId || '';
      roleElement.dataset.principalId = role.principalId || '';
      roleElement.dataset.directoryScopeId = role.directoryScopeId || '/';
      roleElement.dataset.roleType = 'directory';

      const roleName = role.roleName || role.roleDefinitionDisplayName ||
                        role.roleDefinitionId || 'Unknown Role';
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

      // Load saved checkbox state
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
    } else if (roleType === 'azureResource') {
      // Azure resource roles have different structure
      const roleDefinitionId = role.properties?.roleDefinitionId || role.roleDefinitionId || '';
      const principalId = role.properties?.principalId || role.principalId || '';
      const scope = role.properties?.scope || '';

      roleElement.dataset.roleDefinitionId = roleDefinitionId;
      roleElement.dataset.principalId = principalId;
      roleElement.dataset.scope = scope;
      roleElement.dataset.subscriptionId = role.subscriptionId || '';
      roleElement.dataset.roleType = 'azureResource';

      // Get role name from expandedProperties or fallback
      const roleName = role.properties?.expandedProperties?.roleDefinition?.displayName ||
                        role.roleName || 'Unknown Role';
      const subscriptionName = role.subscriptionName || 'Unknown Subscription';
      const scopeDisplay = extractScopeName(scope);

      const roleId = `azrole-${roleDefinitionId.replace(/[^a-zA-Z0-9]/g, '')}${Math.random().toString(36).substr(2, 5)}`;

      roleElement.innerHTML = `
        <div class="role-flex-container">
          <input type="checkbox" id="${roleId}-checkbox" class="role-checkbox">
          <div class="role-details">
            <div class="role-title">${escapeHTML(roleName)}</div>
            <div class="role-scope">${escapeHTML(subscriptionName)}${scopeDisplay ? ` / ${escapeHTML(scopeDisplay)}` : ''}</div>
          </div>
        </div>
      `;

      rolesList.appendChild(roleElement);

      // Set up checkbox event listener
      const checkbox = document.getElementById(`${roleId}-checkbox`);

      // Load saved checkbox state
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
    }

    return roleElement;
  }

  // Helper function to extract scope name from scope path
  function extractScopeName(scope) {
    if (!scope) return '';

    // Extract resource group name or resource name from scope
    const rgMatch = scope.match(/\/resourceGroups\/([^/]+)/i);
    if (rgMatch) {
      const resourceMatch = scope.match(/\/providers\/[^/]+\/[^/]+\/([^/]+)/i);
      if (resourceMatch) {
        return `${rgMatch[1]} > ${resourceMatch[1]}`;
      }
      return rgMatch[1];
    }

    return '';
  }

  // Legacy function kept for backwards compatibility (now calls displayAllRoles)
  function displayRoles(data) {
    displayAllRoles({
      directoryRoles: data,
      azureResourceRoles: { value: [] },
      errors: []
    });
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
  
  // Function to gather selected roles with their data (handles both role types)
  function getSelectedRoles() {
    const selectedRoles = [];

    document.querySelectorAll('.role-checkbox:checked').forEach(checkbox => {
      const roleItem = checkbox.closest('.role-item');
      if (roleItem) {
        const roleType = roleItem.dataset.roleType;
        const roleTitleElement = roleItem.querySelector('.role-title');

        if (roleType === 'azureResource') {
          // Azure resource role
          selectedRoles.push({
            roleType: 'azureResource',
            roleDefinitionId: roleItem.dataset.roleDefinitionId,
            principalId: roleItem.dataset.principalId,
            scope: roleItem.dataset.scope,
            subscriptionId: roleItem.dataset.subscriptionId,
            roleName: roleTitleElement ? roleTitleElement.textContent : 'Unknown Role',
            properties: {
              roleDefinitionId: roleItem.dataset.roleDefinitionId,
              principalId: roleItem.dataset.principalId,
              scope: roleItem.dataset.scope
            }
          });
        } else {
          // Directory role (default)
          selectedRoles.push({
            roleType: 'directory',
            roleDefinitionId: roleItem.dataset.roleDefinitionId,
            principalId: roleItem.dataset.principalId,
            directoryScopeId: roleItem.dataset.directoryScopeId || "/",
            roleName: roleTitleElement ? roleTitleElement.textContent : 'Unknown Role'
          });
        }
      }
    });

    return selectedRoles;
  }

  // Filter roles based on search term and filter type
  function filterRoles() {
    const allRoleItems = document.querySelectorAll('.role-item');
    const allRoleSections = document.querySelectorAll('.role-section');
    let visibleCount = 0;
    let totalCount = allRoleItems.length;

    allRoleItems.forEach(roleItem => {
      const roleType = roleItem.dataset.roleType;
      const roleTitleElement = roleItem.querySelector('.role-title');
      const roleScopeElement = roleItem.querySelector('.role-scope');

      const roleName = roleTitleElement ? roleTitleElement.textContent.toLowerCase() : '';
      const roleScope = roleScopeElement ? roleScopeElement.textContent.toLowerCase() : '';

      // Check filter type
      let matchesFilter = true;
      if (currentFilter === 'directory') {
        matchesFilter = roleType === 'directory';
      } else if (currentFilter === 'azureResource') {
        matchesFilter = roleType === 'azureResource';
      }

      // Check search term
      let matchesSearch = true;
      if (currentSearchTerm) {
        matchesSearch = roleName.includes(currentSearchTerm) || roleScope.includes(currentSearchTerm);
      }

      // Show/hide based on both criteria
      const shouldShow = matchesFilter && matchesSearch;
      roleItem.style.display = shouldShow ? '' : 'none';

      if (shouldShow) {
        visibleCount++;
      }
    });

    // Show/hide role section headings based on filter
    allRoleSections.forEach(section => {
      const sectionTitle = section.querySelector('.role-section-title');
      if (sectionTitle) {
        const titleText = sectionTitle.textContent;
        
        // Hide Entra ID section when Azure Resource filter is active
        if (currentFilter === 'azureResource' && titleText.includes('Entra ID')) {
          section.style.display = 'none';
        }
        // Hide Azure Resource section when Entra ID filter is active
        else if (currentFilter === 'directory' && titleText.includes('Azure Resource')) {
          section.style.display = 'none';
        }
        // Show all sections when 'all' filter is active
        else if (currentFilter === 'all') {
          section.style.display = '';
        }
        // For other cases, check if section has any visible roles
        else {
          const visibleRolesInSection = section.querySelectorAll('.role-item:not([style*="display: none"])');
          section.style.display = visibleRolesInSection.length > 0 ? '' : 'none';
        }
      }
    });

    // Update results count
    updateSearchResultsCount(visibleCount, totalCount);

    // Show/hide "no results" message
    updateNoResultsMessage(visibleCount);
  }

  // Update search results count display
  function updateSearchResultsCount(visible, total) {
    if (currentSearchTerm || currentFilter !== 'all') {
      searchResultsCount.textContent = `Showing ${visible} of ${total} roles`;
      searchResultsCount.classList.remove('hidden');
    } else {
      searchResultsCount.classList.add('hidden');
    }
  }

  // Show "no results" message if all roles are hidden
  function updateNoResultsMessage(visibleCount) {
    // Remove existing no-results message if any
    const existingMessage = rolesList.querySelector('.no-results-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Add no-results message if needed
    if (visibleCount === 0 && (currentSearchTerm || currentFilter !== 'all')) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'no-results-message';
      noResultsDiv.innerHTML = `
        <div class="icon">🔍</div>
        <p><strong>No roles found</strong></p>
        <p>Try adjusting your search or filter criteria</p>
      `;
      rolesList.appendChild(noResultsDiv);
    }
  }

  // Switch between tabs
  function switchTab(tabName) {
    currentTab = tabName;

    // Update tab button active states
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Show/hide appropriate containers
    if (tabName === 'eligible') {
      rolesContainer.classList.remove('hidden');
      activeRolesContainer.classList.add('hidden');

      // Stop active roles interval if running
      if (activeRolesInterval) {
        clearInterval(activeRolesInterval);
        activeRolesInterval = null;
      }
    } else if (tabName === 'active') {
      rolesContainer.classList.add('hidden');
      activeRolesContainer.classList.remove('hidden');

      // Load and display active roles
      loadActiveRoles();

      // Set up interval to refresh active roles every 30 seconds
      if (activeRolesInterval) {
        clearInterval(activeRolesInterval);
      }
      activeRolesInterval = setInterval(() => {
        loadActiveRoles();
      }, 30000); // 30 seconds
    }
  }

  // Load active roles from both APIs
  function loadActiveRoles() {
    statusMessage.textContent = 'Loading active roles...';

    chrome.runtime.sendMessage({ action: 'getActiveRoles' }, function(response) {
      if (response && response.success) {
        displayActiveRoles(response.data);
        statusMessage.textContent = 'Active roles loaded';
      } else {
        showError(response?.error || 'Failed to load active roles');
      }
    });
  }

  // Display active roles with countdown timers
  function displayActiveRoles(data) {
    activeRolesList.innerHTML = '';

    const activeDirectoryRoles = data.activeDirectoryRoles?.value || [];
    const activeAzureResourceRoles = data.activeAzureResourceRoles?.value || [];
    const errors = data.errors || [];

    // Debug logging
    console.log('Active Directory Roles count:', activeDirectoryRoles.length);
    console.log('Active Azure Resource Roles count:', activeAzureResourceRoles.length);
    console.log('Active Azure Resource Roles data:', activeAzureResourceRoles);
    console.log('Errors:', errors);

    // Display errors if any
    if (errors.length > 0) {
      const errorSection = document.createElement('div');
      errorSection.className = 'warning-section';
      errorSection.innerHTML = '<p><strong>⚠️ Some active roles could not be loaded:</strong></p>';
      errors.forEach(err => {
        const errorMsg = document.createElement('p');
        errorMsg.className = 'error-message';
        errorMsg.textContent = `${err.type}: ${err.error}`;
        errorSection.appendChild(errorMsg);
      });
      activeRolesList.appendChild(errorSection);
    }

    // Check if we have any active roles
    if (activeDirectoryRoles.length === 0 && activeAzureResourceRoles.length === 0) {
      activeRolesList.innerHTML += `
        <div class="no-active-roles">
          <div class="icon">⏸️</div>
          <p><strong>No active roles</strong></p>
          <p>Switch to "Eligible Roles" tab to activate roles</p>
        </div>
      `;
      return;
    }

    // Display Directory Active Roles section
    if (activeDirectoryRoles.length > 0) {
      const directorySection = document.createElement('div');
      directorySection.className = 'role-section';
      directorySection.innerHTML = '<h3 class="role-section-title">🔐 Active Entra ID Roles</h3>';

      activeDirectoryRoles.forEach(role => {
        const roleCard = createActiveRoleCard(role, 'directory');
        directorySection.appendChild(roleCard);
      });

      activeRolesList.appendChild(directorySection);
    }

    // Display Azure Resource Active Roles section
    if (activeAzureResourceRoles.length > 0) {
      const azureSection = document.createElement('div');
      azureSection.className = 'role-section';
      azureSection.innerHTML = '<h3 class="role-section-title">☁️ Active Azure Resource Roles</h3>';

      activeAzureResourceRoles.forEach(role => {
        const roleCard = createActiveRoleCard(role, 'azureResource');
        azureSection.appendChild(roleCard);
      });

      activeRolesList.appendChild(azureSection);
    }
  }

  // Create an active role card with countdown timer
  function createActiveRoleCard(role, roleType) {
    const card = document.createElement('div');
    card.className = 'active-role-card';

    let roleName, scopeInfo, endDateTime;

    if (roleType === 'directory') {
      roleName = role.roleName || role.roleDefinition?.displayName || 'Unknown Role';
      scopeInfo = 'Directory scope';
      endDateTime = role.endDateTime;
    } else if (roleType === 'azureResource') {
      roleName = role.properties?.expandedProperties?.roleDefinition?.displayName || 'Unknown Role';
      const subscriptionName = role.subscriptionName || 'Unknown Subscription';
      const scopeDisplay = extractScopeName(role.properties?.scope || '');
      scopeInfo = `${subscriptionName}${scopeDisplay ? ` / ${scopeDisplay}` : ''}`;
      endDateTime = role.properties?.endDateTime;
    }

    if (!endDateTime) {
      // No expiration time, just show basic info
      card.innerHTML = `
        <div class="active-role-header">
          <div class="active-role-name">${escapeHTML(roleName)}</div>
          <span class="active-role-badge active">Active</span>
        </div>
        <div class="active-role-info">${escapeHTML(scopeInfo)}</div>
      `;
      return card;
    }

    // Calculate time remaining
    const endTime = new Date(endDateTime).getTime();
    const now = Date.now();
    const timeRemaining = endTime - now;

    // Determine if expiring soon (less than 15 minutes)
    const isExpiringSoon = timeRemaining < 15 * 60 * 1000;

    if (isExpiringSoon) {
      card.classList.add('expiring-soon');
    }

    // Create unique ID for this card
    const cardId = `active-role-${Math.random().toString(36).substr(2, 9)}`;
    card.id = cardId;

    card.innerHTML = `
      <div class="active-role-header">
        <div class="active-role-name">${escapeHTML(roleName)}</div>
        <span class="active-role-badge ${isExpiringSoon ? 'expiring' : 'active'}">
          ${isExpiringSoon ? '⚠️ Expiring' : 'Active'}
        </span>
      </div>
      <div class="active-role-info">${escapeHTML(scopeInfo)}</div>
      <div class="active-role-timer">
        <div class="timer-progress-bar">
          <div class="timer-progress-fill ${isExpiringSoon ? 'expiring-soon' : ''}" id="${cardId}-progress"></div>
          <div class="timer-text-overlay ${isExpiringSoon ? 'expiring-soon' : ''}" id="${cardId}-timer"></div>
        </div>
      </div>
    `;

    // Start countdown timer after a brief delay to ensure DOM is ready
    setTimeout(() => {
      updateCountdown(cardId, endTime);
    }, 10);

    return card;
  }

  // Update countdown timer for a role card
  function updateCountdown(cardId, endTime) {
    const timerElement = document.getElementById(`${cardId}-timer`);
    const progressElement = document.getElementById(`${cardId}-progress`);

    if (!timerElement || !progressElement) return;

    const updateTimer = () => {
      const now = Date.now();
      const timeRemaining = endTime - now;

      if (timeRemaining <= 0) {
        timerElement.textContent = 'Expired';
        progressElement.style.width = '0%';
        return;
      }

      // Calculate hours, minutes, seconds
      const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

      // Format time string
      let timeString = '';
      if (hours > 0) {
        timeString = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        timeString = `${minutes}m ${seconds}s`;
      } else {
        timeString = `${seconds}s`;
      }

      timerElement.textContent = timeString;

      // Update progress bar (assume 8 hour max duration for calculation)
      const maxDuration = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      const percentRemaining = Math.max(0, Math.min(100, (timeRemaining / maxDuration) * 100));
      progressElement.style.width = `${percentRemaining}%`;
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(() => {
      updateTimer();

      // Stop if timer expired or card no longer exists
      if (!document.getElementById(cardId)) {
        clearInterval(interval);
      }
    }, 1000);
  }
});
