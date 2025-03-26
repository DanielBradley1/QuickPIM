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

// Export functions for use in popup.js
if (typeof module !== 'undefined') {
  module.exports = {
    activatePimRoles
  };
}
