console.log('Entra PIM Role Viewer background script loaded');

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
    
    // Call the PIM roles endpoint
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/roleManagement/directory/roleEligibilityScheduleRequests/filterByCurrentUser(on=\'principal\')', 
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
    
    return await response.json();
  } catch (error) {
    console.error('Error getting PIM roles:', error);
    throw error;
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
