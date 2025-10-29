/**
 * Role Activation API Module
 * Handles PIM role activation requests to Microsoft Graph API
 */

// Function to activate selected PIM roles
async function activatePimRoles(selectedRoles, durationHours, justification, token, ticketInfo = {}) {
  if (!token) {
    throw new Error('No access token available');
  }

  if (!selectedRoles || selectedRoles.length === 0) {
    throw new Error('No roles selected for activation');
  }

  if (!justification || justification.trim() === '') {
    throw new Error('Justification is required');
  }

  if (durationHours <= 0) {
    throw new Error('Duration must be greater than 0 hours');
  }

  // Convert duration from hours to ISO 8601 duration format
  const isoDuration = `PT${Math.round(durationHours * 60)}M`; // Convert to minutes for more precision

  // Current time in ISO format
  const startDateTime = new Date().toISOString();

  // Process each role activation request
  const results = [];
  const errors = [];

  for (const role of selectedRoles) {
    try {
      // Prepare request body
      const requestBody = {
        "action": "selfActivate",
        "principalId": role.principalId,
        "roleDefinitionId": role.roleDefinitionId,
        "directoryScopeId": role.directoryScopeId || "/",
        "justification": justification,
        "scheduleInfo": {
          "startDateTime": startDateTime,
          "expiration": {
            "type": "AfterDuration",
            "duration": isoDuration
          }
        }
      };

      // Add ticket info if both system and number are provided
      if (ticketInfo.ticketSystem || ticketInfo.ticketNumber) {
        requestBody.ticketInfo = {
          "ticketSystem": ticketInfo.ticketSystem || "Self-Service",
          "ticketNumber": ticketInfo.ticketNumber || "N/A"
        };
      }

      // Send activation request to Graph API
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignmentScheduleRequests',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const responseData = await response.json();
      results.push({
        role: role.roleName || role.roleDefinitionId,
        success: true,
        requestId: responseData.id
      });

    } catch (error) {
      console.error('Role activation error:', error);
      errors.push({
        role: role.roleName || role.roleDefinitionId,
        success: false,
        error: error.message
      });
    }
  }

  return {
    success: errors.length === 0,
    results: results,
    errors: errors
  };
}

// Function to get currently selected roles from DOM
function getSelectedRoles() {
  return Array.from(document.querySelectorAll('.role-checkbox:checked'))
    .map(checkbox => {
      // Get the parent role item
      const roleItem = checkbox.closest('.role-item');
      if (!roleItem) return null;
      
      // Extract role information from data attributes
      const roleId = checkbox.id.replace('-checkbox', '');
      
      // Find data stored in chrome.storage
      return {
        roleId: roleId,
        // These properties will be filled from the roles data in popup.js
        roleDefinitionId: roleItem.dataset.roleDefinitionId,
        principalId: roleItem.dataset.principalId,
        directoryScopeId: roleItem.dataset.directoryScopeId,
        roleName: roleItem.querySelector('.role-title').textContent
      };
    })
    .filter(role => role !== null);
}

// Function to activate Azure resource PIM roles
async function activateAzureResourceRoles(selectedRoles, durationHours, justification, azureManagementToken, ticketInfo = {}) {
  if (!azureManagementToken) {
    throw new Error('No Azure Management token available');
  }

  if (!selectedRoles || selectedRoles.length === 0) {
    throw new Error('No roles selected for activation');
  }

  if (!justification || justification.trim() === '') {
    throw new Error('Justification is required');
  }

  if (durationHours <= 0) {
    throw new Error('Duration must be greater than 0 hours');
  }

  // Convert duration from hours to ISO 8601 duration format
  const isoDuration = `PT${Math.round(durationHours * 60)}M`; // Convert to minutes for more precision

  // Current time in ISO format
  const startDateTime = new Date().toISOString();

  // Process each role activation request
  const results = [];
  const errors = [];

  for (const role of selectedRoles) {
    try {
      // Generate a new GUID for the request
      const requestId = generateGuid();

      // Extract scope from the role (could be subscription, resource group, or resource)
      const scope = role.properties?.scope || `/subscriptions/${role.subscriptionId}`;

      // Prepare request body for Azure Resource Manager API
      const requestBody = {
        "properties": {
          "principalId": role.properties?.principalId || role.principalId,
          "roleDefinitionId": role.properties?.roleDefinitionId || role.roleDefinitionId,
          "requestType": "SelfActivate",
          "justification": justification,
          "scheduleInfo": {
            "startDateTime": startDateTime,
            "expiration": {
              "type": "AfterDuration",
              "endDateTime": null,
              "duration": isoDuration
            }
          }
        }
      };

      // Add ticket info if provided
      if (ticketInfo.ticketSystem || ticketInfo.ticketNumber) {
        requestBody.properties.ticketInfo = {
          "ticketSystem": ticketInfo.ticketSystem || "Self-Service",
          "ticketNumber": ticketInfo.ticketNumber || "N/A"
        };
      }

      // Send activation request to Azure Management API
      const response = await fetch(
        `https://management.azure.com${scope}/providers/Microsoft.Authorization/roleAssignmentScheduleRequests/${requestId}?api-version=2020-10-01`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${azureManagementToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`
        );
      }

      const responseData = await response.json();
      results.push({
        role: role.roleName || role.properties?.expandedProperties?.roleDefinition?.displayName || 'Unknown Role',
        scope: role.subscriptionName || scope,
        success: true,
        requestId: responseData.name
      });

    } catch (error) {
      console.error('Azure resource role activation error:', error);
      errors.push({
        role: role.roleName || role.properties?.expandedProperties?.roleDefinition?.displayName || 'Unknown Role',
        scope: role.subscriptionName || 'Unknown Scope',
        success: false,
        error: error.message
      });
    }
  }

  return {
    success: errors.length === 0,
    results: results,
    errors: errors
  };
}

// Helper function to generate a GUID
function generateGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to activate roles (handles both directory and Azure resource roles)
async function activateAllRoles(selectedRoles, durationHours, justification, graphToken, azureManagementToken, ticketInfo = {}) {
  const directoryRoles = selectedRoles.filter(role => role.roleType !== 'azureResource');
  const azureResourceRoles = selectedRoles.filter(role => role.roleType === 'azureResource');

  const allResults = {
    success: true,
    results: [],
    errors: []
  };

  // Activate directory roles
  if (directoryRoles.length > 0 && graphToken) {
    try {
      const directoryResult = await activatePimRoles(directoryRoles, durationHours, justification, graphToken, ticketInfo);
      allResults.results.push(...directoryResult.results);
      allResults.errors.push(...directoryResult.errors);
    } catch (error) {
      allResults.errors.push({
        role: 'Directory Roles',
        success: false,
        error: error.message
      });
    }
  }

  // Activate Azure resource roles
  if (azureResourceRoles.length > 0 && azureManagementToken) {
    try {
      const azureResourceResult = await activateAzureResourceRoles(azureResourceRoles, durationHours, justification, azureManagementToken, ticketInfo);
      allResults.results.push(...azureResourceResult.results);
      allResults.errors.push(...azureResourceResult.errors);
    } catch (error) {
      allResults.errors.push({
        role: 'Azure Resource Roles',
        success: false,
        error: error.message
      });
    }
  }

  allResults.success = allResults.errors.length === 0;
  return allResults;
}

// Export functions for use in popup.js
if (typeof module !== 'undefined') {
  module.exports = {
    activatePimRoles,
    activateAzureResourceRoles,
    activateAllRoles
  };
}
