/**
 * Token Decoder Module
 * Decodes JWT tokens and extracts user information
 */

// Function to decode JWT token without external libraries
function decodeToken(token) {
  if (!token) {
    return null;
  }

  try {
    // JWT tokens are made of three parts: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token format');
      return null;
    }

    // Decode the payload (middle part)
    const payload = parts[1];
    // Base64Url decode and parse as JSON
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// Function to extract principalId (oid) from token
function extractPrincipalId(token) {
  const decoded = decodeToken(token);
  if (!decoded) {
    return null;
  }
  
  // In Microsoft identity tokens, the 'oid' claim contains the user's Object ID
  return decoded.oid || null;
}

// Function to get user information from token
function getUserInfo(token) {
  const decoded = decodeToken(token);
  if (!decoded) {
    return null;
  }
  
  // Return common user properties from the token
  return {
    principalId: decoded.oid || null,
    upn: decoded.upn || decoded.email || null,
    name: decoded.name || null,
    preferredUsername: decoded.preferred_username || null
  };
}

// Export functions for use in other modules
if (typeof module !== 'undefined') {
  module.exports = {
    decodeToken,
    extractPrincipalId,
    getUserInfo
  };
}
