console.log('Entra PIM Role Viewer background script loaded');

// Import tokenDecoder.js
importScripts('tokenDecoder.js');

// Listen for web requests to Microsoft Graph API
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.url.includes('graph.microsoft.com')) {
      // We found a request to Graph API, look for authentication headers
      captureAuthToken(details.requestId, details.url);
    }
  },
  {urls: ["https://graph.microsoft.com/*"]}
);

// Capture authentication token from request headers
chrome.webRequest.onSendHeaders.addListener(
  function(details) {
    if (details.url.includes('graph.microsoft.com')) {
      const authHeader = details.requestHeaders.find(header => 
        header.name.toLowerCase() === 'authorization'
      );
      
      if (authHeader && authHeader.value.startsWith('Bearer ')) {
        // Extract the token (remove "Bearer " prefix)
        const token = authHeader.value.substring(7);
        
        // Store the token
        chrome.storage.local.set({ 
          graphToken: token,
          tokenTimestamp: Date.now(),
          tokenSource: details.url
        });
        
        console.log('Graph API token captured!');
      }
    }
  },
  {urls: ["https://graph.microsoft.com/*"]},
  ["requestHeaders"]
);

// Function to capture auth token from a specific request
function captureAuthToken(requestId, url) {
  console.log(`Monitoring request to: ${url}`);
}

// Handle messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getPimRoles") {
    getPimRoles()
      .then(data => sendResponse({ success: true, data: data }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true; // Indicates async response
  } else if (request.action === "getTokenStatus") {
    getTokenStatus()
      .then(status => sendResponse({ success: true, status: status }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true;
  } else if (request.action === "manualSetToken") {
    setManualToken(request.token)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true;
  } else if (request.action === "clearToken") {
    clearToken()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
    return true;
  }
});

// Function to get PIM roles using the stored token
async function getPimRoles() {
  try {
    // Get token from storage
    const { graphToken, tokenTimestamp } = 
      await chrome.storage.local.get(['graphToken', 'tokenTimestamp']);
    
    if (!graphToken) {
      throw new Error('No Microsoft Graph token found. Please visit a Microsoft service like portal.azure.com first.');
    }
    
    // Check if token is older than 45 minutes (tokens typically expire after 1 hour)
    const tokenAgeInMinutes = (Date.now() - tokenTimestamp) / (1000 * 60);
    if (tokenAgeInMinutes > 45) {
      throw new Error('Token may have expired. Please refresh your Microsoft service session.');
    }
    
    console.log('Using captured token to fetch PIM roles');
    
    // Extract principalId from token using the decoder function
    const principalId = extractPrincipalId(graphToken);
    
    if (!principalId) {
      throw new Error('Could not extract user ID from token. Please refresh your session.');
    }
    
    console.log('Using principalId:', principalId);
    
    // Call the PIM roles endpoint with the extracted principalId
    const response = await fetch(
      `https://graph.microsoft.com/beta/roleManagement/directory/roleEligibilitySchedules?$filter=principalId eq '${principalId}'`, 
      {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${graphToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Resolve role definition names
    if (data.value && data.value.length > 0) {
      const roleDefinitions = await getRoleDefinitions(graphToken);
      
      // Map role definition IDs to friendly names
      data.value = data.value.map(role => {
        if (role.roleDefinitionId && roleDefinitions[role.roleDefinitionId]) {
          role.roleName = roleDefinitions[role.roleDefinitionId];
        }
        return role;
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error getting PIM roles:', error);
    throw error;
  }
}

// Cache for role definitions
let roleDefinitionsCache = null;
let roleDefinitionsCacheTime = null;

// Function to get role definitions
async function getRoleDefinitions(token) {
  // Check if we have a recent cache (less than 1 hour old)
  if (roleDefinitionsCache && roleDefinitionsCacheTime && 
      (Date.now() - roleDefinitionsCacheTime) < 3600000) {
    console.log('Using cached role definitions');
    return roleDefinitionsCache;
  }
  
  console.log('Fetching role definitions from Graph API');
  try {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions', 
      {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Role definitions API call failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Create a mapping of role definition ID to display name
    const roleDefinitions = {};
    if (data.value) {
      data.value.forEach(role => {
        if (role.id && role.displayName) {
          roleDefinitions[role.id] = role.displayName;
        }
      });
    }
    
    // Update the cache
    roleDefinitionsCache = roleDefinitions;
    roleDefinitionsCacheTime = Date.now();
    
    return roleDefinitions;
  } catch (error) {
    console.error('Error fetching role definitions:', error);
    return {}; // Return empty object on error
  }
}

// Function to get token status
async function getTokenStatus() {
  const { graphToken, tokenTimestamp, tokenSource } = 
    await chrome.storage.local.get(['graphToken', 'tokenTimestamp', 'tokenSource']);
  
  if (!graphToken) {
    return { hasToken: false };
  }
  
  const tokenAgeInMinutes = (Date.now() - tokenTimestamp) / (1000 * 60);
  
  return {
    hasToken: true,
    tokenAge: Math.round(tokenAgeInMinutes),
    isExpired: tokenAgeInMinutes > 45,
    source: tokenSource
  };
}

// Function to set a token manually
async function setManualToken(token) {
  if (!token || token.length < 50) {
    throw new Error('Invalid token provided');
  }
  
  await chrome.storage.local.set({
    graphToken: token,
    tokenTimestamp: Date.now(),
    tokenSource: 'manual-entry'
  });
  
  return true;
}

// Function to clear the stored token
async function clearToken() {
  await chrome.storage.local.remove(['graphToken', 'tokenTimestamp', 'tokenSource']);
  return true;
}
