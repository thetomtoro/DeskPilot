# VPN Setup Guide — GlobalProtect

**Owner:** IT Operations
**Last Updated:** March 2025

---

## Overview

Acme Corp uses **Palo Alto GlobalProtect** as its corporate VPN. All employees working remotely must connect to the VPN to access internal systems including the corporate intranet, Jira, Confluence, internal APIs, and production environments.

VPN Portal: **vpn.acmecorp.com**

---

## Installation

### macOS

1. Open your browser and go to **vpn.acmecorp.com**.
2. Log in with your Acme Corp SSO credentials.
3. Click **Download GlobalProtect** and select **macOS**.
4. Run the downloaded `.pkg` installer and follow the prompts.
5. After installation, open **GlobalProtect** from the menu bar.
6. Enter the portal address: `vpn.acmecorp.com`.
7. Sign in with your SSO credentials when prompted.

### Windows

1. Go to **vpn.acmecorp.com** in any browser.
2. Log in with your SSO credentials.
3. Download the **Windows 64-bit** installer.
4. Run the `.msi` installer as Administrator.
5. Open GlobalProtect from the system tray.
6. Enter portal `vpn.acmecorp.com` and authenticate.

### Linux

1. Request the Linux GlobalProtect package from IT via a ServiceNow ticket.
2. IT will provide the appropriate `.deb` or `.rpm` package for your distribution.
3. Install using `sudo dpkg -i globalprotect.deb` (Debian/Ubuntu) or `sudo rpm -i globalprotect.rpm` (RHEL/Fedora).
4. Start the service: `sudo systemctl start gpd`.
5. Connect: `globalprotect connect --portal vpn.acmecorp.com`.

---

## Configuration Details

| Setting | Value |
|---|---|
| Portal address | vpn.acmecorp.com |
| Authentication | SSO (Okta) |
| Protocol | IPSec/SSL (auto-negotiated) |
| Split tunneling | Disabled — all traffic routed through VPN |

Multi-factor authentication (MFA) via **Okta Verify** is required. Ensure Okta Verify is installed on your mobile device before connecting.

---

## Common Issues & Troubleshooting

### VPN Connects but Disconnects Frequently

- Check your local internet connection stability.
- Disable any local firewall rules that may block UDP port 4501 or TCP port 443.
- On macOS: go to **System Settings > Privacy & Security > Network Extensions** and ensure GlobalProtect is allowed.
- Try switching to SSL-only mode: in GlobalProtect preferences, set **Connection Method** to "SSL."

### Cannot Resolve Internal DNS (e.g., intranet.acmecorp.com)

- Disconnect and reconnect the VPN.
- Flush your local DNS cache: `sudo dscacheutil -flushcache` (macOS) or `ipconfig /flushdns` (Windows).
- Verify that no third-party DNS overrides (e.g., 1.1.1.1) are configured locally while on VPN.

### "Portal Unreachable" Error at Login

- Confirm you have an active internet connection.
- Check the Acme Corp status page at **status.acmecorp.com** for any VPN outages.
- Try from a different network (e.g., mobile hotspot) to rule out local network blocks.

### Authentication Loop / Okta Not Prompting

- Clear browser cookies for `acmecorp.okta.com`.
- Ensure Okta Verify app is up to date.
- If your Okta session is expired, log in to **acmecorp.okta.com** in a browser first, then retry.

### Reinstalling GlobalProtect

If issues persist after troubleshooting:
1. Uninstall GlobalProtect (macOS: drag from Applications; Windows: Control Panel > Programs).
2. Reboot your machine.
3. Download a fresh installer from **vpn.acmecorp.com**.
4. Reinstall following the steps above.

---

## Contacting IT Support

If you cannot resolve VPN issues after following these steps:

- **Slack:** #it-helpdesk
- **ServiceNow:** service.acmecorp.com → "Network / VPN" category
- **Phone (urgent):** IT Help Desk at ext. 4357 (HELP)
- **Email:** it-support@acmecorp.com

Include your OS version, GlobalProtect version, and a description of the error when filing a ticket.
