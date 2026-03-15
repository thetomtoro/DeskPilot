# Software Access Request Workflow

**Owner:** IT Operations & Security
**Last Updated:** February 2025

---

## Overview

Acme Corp manages software access through Okta SSO and ServiceNow. This document covers which tools employees receive by default, how to request additional software, and how access is revoked during offboarding.

---

## Standard Software (Provisioned Automatically)

All full-time employees receive access to the following tools on Day 1, provisioned automatically upon account creation in Workday:

| Tool | Purpose | License Tier |
|---|---|---|
| **Slack** | Team communication | Business+ |
| **Google Workspace** (Gmail, Drive, Docs, Sheets, Meet) | Email, docs, video calls | Business Standard |
| **Okta** | SSO and MFA management | N/A (infrastructure) |
| **Workday** | HR, payroll, time-off | Role-based access |
| **ServiceNow** | IT ticketing and requests | Employee self-service |
| **Zoom** | Video conferencing | Pro |
| **1Password** | Password management | Teams |

### Role-Specific Standard Access

- **Engineers:** GitHub (Acme Org), Jira, Confluence, AWS Console (read-only), Datadog
- **Product Managers:** Jira, Confluence, Figma (Editor), Amplitude
- **Designers:** Figma (Editor), Abstract, Zeplin
- **Sales/Support:** Salesforce (CRM), Zendesk, Gong

---

## Requesting Additional Software

If you need software not in the standard list:

1. Go to **service.acmecorp.com**.
2. Select **Software & Access > New Software Request**.
3. Provide:
   - Software name and vendor
   - Business justification (how it improves your work)
   - Estimated number of licenses needed
   - Annual cost (attach a vendor quote if available)
4. Submit. Your **manager approves** the request first.
5. After manager approval, **IT reviews** for security compliance and license availability.
6. IT will provision access or contact you within **3–5 business days**.

### Approval Thresholds

| Annual Cost | Approval Required |
|---|---|
| Under $500 | Manager only |
| $500–$5,000 | Manager + IT |
| Over $5,000 | Manager + IT + VP/Finance |

Software that processes customer PII or connects to production systems requires an additional **Security review** regardless of cost.

---

## Existing License Pool

Before purchasing a new license, IT checks whether Acme Corp has unused licenses available. Common tools with shared license pools:

- **Figma:** 50 Editor seats (check with IT before purchasing)
- **Miro:** 30 seats
- **Loom:** 40 seats
- **Notion:** Unlimited (existing Enterprise plan)
- **Adobe Creative Cloud:** 10 floating seats (first-come, first-served)

If a license is available in the pool, IT will provision it same-day after manager approval.

---

## Temporary Access

For short-term needs (contractors, project-specific tools), IT can provision **temporary access** with an automatic expiry date (max 90 days). Submit a ServiceNow ticket specifying the end date. Temporary access does not require VP approval even if costs exceed $5,000 for contract work, but requires manager sign-off.

---

## Offboarding — Software Revocation

When an employee leaves Acme Corp:

1. HR initiates the offboarding workflow in Workday on the employee's last day.
2. IT automatically deactivates the Okta account within **4 hours** of the offboarding trigger, revoking access to all SSO-connected apps simultaneously.
3. GitHub org membership is removed within the same window.
4. Any shared credentials stored in 1Password team vaults are rotated by the relevant team lead.
5. Data export requests (e.g., personal files in Google Drive) must be submitted to HR at least **5 business days before the last day**.

Managers are responsible for ensuring no shared credentials were held outside of 1Password.

---

## Security & Compliance Notes

- All software accessing Acme Corp data must use **SSO via Okta** — no standalone username/password accounts for approved tools.
- Personal/free-tier accounts for business tools (e.g., a personal Notion) are not permitted for work data.
- The IT Security team conducts quarterly access reviews. Unused licenses are reclaimed automatically.

---

## Contact

- **ServiceNow:** service.acmecorp.com
- **Slack:** #it-helpdesk
- **Email:** it-security@acmecorp.com (for security-related access questions)
