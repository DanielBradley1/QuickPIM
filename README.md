# QuickPIM

![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/DanielatOCN)
[![LinkedIn: Daniel Bradley](https://img.shields.io/badge/LinkedIn-Daniel%20Bradley-blue?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/danielbradley2/) 
[![Website](https://img.shields.io/badge/Blog-Our%20Cloud%20Network-orange?style=flat-square&logo=internet-explorer)](https://ourcloudnetwork.com/)

A Chrome extension that allows you to activate multiple PIM (Privileged Identity Management) roles simultaneously in Microsoft Entra.

## Overview

QuickPIM streamlines the process of activating multiple PIM roles in Azure AD. Instead of activating each role individually, this extension allows you to select and activate multiple roles at once, saving time and reducing administrative overhead.

<p align="left">
  <img src="preview/QuickPIM1.png" alt="QuickPIM Interface" width="600">
</p>

It works by obtaining a bearer token from the header of your browser's requests to Microsoft Graph. It then stores that token within your Chrome storage and uses it to obtain and activate your selected PIM roles.

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
https://github.com/DanielBradley1/MiToken
### Manual Installation
1. Download the latest release from the [Releases page](https://github.com/DanielBradley1/QuickPIM/releases)
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
