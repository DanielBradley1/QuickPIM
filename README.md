<p align="center">
  <img src="img/quickpim-logo.png" alt="QuickPIM Logo" width="200">
</p>

# QuickPIM

A Chrome extension that allows you to activate multiple PIM (Privileged Identity Management) roles simultaneously in Microsoft Entra.

[![Author: Daniel Bradley](https://img.shields.io/badge/Author-Daniel%20Bradley-blue?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/danielbradley2/) 
[![Website](https://img.shields.io/badge/Website-Our%20Cloud%20Network-orange?style=flat-square&logo=internet-explorer)](https://ourcloudnetwork.com/)

## Overview

QuickPIM streamlines the process of activating multiple PIM roles in Azure AD. Instead of activating each role individually, this extension allows you to select and activate multiple roles at once, saving time and reducing administrative overhead.

<p align="center">
  <img src="img/QuickPIM1.png" alt="QuickPIM Interface" width="600">
</p>

## Features

- Activate multiple PIM roles simultaneously
- Customisable activation duration
- Simple and intuitive user interface
- Secure authentication using existing browser bearer token
- Notification system for role activation status

## Installation

### From Chrome Web Store
1. Visit the [QuickPIM extension page](https://chrome.google.com/webstore/detail/quickpim/[extension-id]) on the Chrome Web Store (***waiting approval***)
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Manual Installation
1. Download the latest release from the [Releases page](https://github.com/[username]/QuickPIM/releases)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the downloaded extension folder

## Usage

1. Open the Microsoft Entra portal and click around briefly 
2. Click on the QuickPIM icon in your Chrome toolbar
3. Select the roles you want to activate from the displayed list
4. Set the activation duration (optional)
5. Click "Activate Selected Roles"
6. Confirm the activation in the Azure AD prompt if required

## Limitations

- Unable to activate roles protected by Authentication Contexts

## Privacy

QuickPIM does not collect or transmit any personal data. All authentication is handled directly within the browser.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.