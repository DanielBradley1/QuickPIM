# QuickPIM - Future Enhancements & Feature Roadmap

This document outlines potential improvements, advanced features, and architectural enhancements for QuickPIM.

## 🎉 Recently Implemented Features

### October 2025 Update

**✅ Active Roles Dashboard** - Complete visibility into currently active PIM roles
- Tab navigation between Eligible Roles and Active Roles
- Live countdown timers with progress bars
- Auto-refresh every 30 seconds
- Expiring soon warnings (< 15 minutes)
- Supports both Entra ID and Azure Resource roles

**✅ Search & Filter** - Quickly find roles among hundreds of eligible assignments
- Real-time search bar with instant filtering
- Filter chips for All/Entra ID/Azure Resource roles
- Keyboard shortcut (Ctrl+F) support
- Results count and "no results" messaging

---

## 🔐 Token Management & Security

### Current Limitation
Passive token capture with no refresh mechanism. Tokens expire after ~1 hour requiring manual browser refresh.

### Proposed Enhancements

**Token Auto-Refresh**
- Proactively refresh tokens before 45-minute expiration using silent auth flows
- Implement background token renewal to maintain continuous access
- Add token lifetime monitoring with visual indicators

**Multi-Tenant Support**
- Capture and manage tokens for multiple Azure tenants simultaneously
- Tenant switcher in UI to toggle between different organizations
- Per-tenant role caching and preferences

**Token Health Dashboard**
- Real-time visual indicator of token freshness for both Graph API and Azure Management API
- Color-coded status: Green (fresh), Yellow (expiring soon), Red (expired)
- Last refresh timestamp display

**Encrypted Storage**
- Encrypt tokens at rest using Web Crypto API
- Add optional master password for additional security layer
- Secure token clearing on browser close option

**Conditional Access Detection**
- Parse token claims to detect Conditional Access policies
- Warn users about MFA requirements or device compliance before activation
- Display token scope and permissions granted

---

## 🎯 Role Management Intelligence

### High Impact Features

**1. Role Favorites/Presets**
- Save role combinations with custom names (e.g., "Production Incident", "Security Review", "Database Maintenance")
- One-click activation of preset groups
- Cloud sync across devices using Chrome sync storage
- Import/export presets as JSON for team sharing

**2. Smart Duration Suggestions**
- Learn from activation history: "You usually activate this role for 4 hours"
- Context-aware suggestions: Longer durations for complex roles, shorter for read-only
- Role-specific defaults based on organizational policies

**3. Bulk Operations**
- **Deactivate All**: End-of-day cleanup button to remove all active roles
- **Extend All**: Extend all currently active roles by X hours
- **Copy from Yesterday**: Repeat previous day's role activations
- **Activate All Eligible**: Emergency button for critical incidents

**4. Role Templates with Variables**
```
Template: "Incident #{{ticket}} - {{severity}} priority"
Integration: Auto-fill from ServiceNow/Jira/PagerDuty
Variables: ticket, severity, description, assignee
```

---

## ☁️ Complete Azure Coverage

### Current Gap
Only subscription-level resource roles are supported. Missing management groups, resource groups, and individual resource scopes.

### Proposed Coverage

**Management Groups**
- Fetch roles from management group hierarchy
- Visualize inherited permissions
- Support for cross-tenant management groups

**Resource Groups**
- Show RG-scoped roles separately from subscription roles
- Filter by resource group
- Bulk activate all roles in specific RG

**Individual Resources**
- Expand resource groups to show individual resources (VMs, Storage Accounts, Key Vaults, etc.)
- Resource-specific role activation
- Support for all Azure resource types

**Scope Tree View**
Hierarchical visualization:
```
📁 Management Group: Contoso
  └─ 💳 Subscription: Production
     └─ 📦 Resource Group: rg-web-prod
        ├─ 🖥️ Virtual Machine: vm-web-01
        ├─ 🗄️ Storage Account: stwebprod
        └─ 🔑 Key Vault: kv-web-prod
```

**Scope Filtering**
- "Show only subscription-level roles"
- "Show only resource group roles"
- Scope search and filter

---

## 📊 Active Role Visibility ✅ **IMPLEMENTED**

### Implementation Status: COMPLETED (2025-10-29)

**✅ Active Roles Section**
- ✅ Display all currently active role assignments (both directory and Azure resource)
- ✅ Real-time status with "Active" and "Expiring Soon" badges
- ✅ Tab navigation to switch between "Eligible Roles" and "Active Roles"
- ✅ Separate sections for Entra ID vs Azure Resource active roles

**✅ Time Remaining**
- ✅ Live countdown timers for each active role (updates every second)
- ✅ Visual progress bars showing time consumed vs remaining
- ✅ White text overlay on progress bar showing remaining time (e.g., "5h 30m")
- ✅ Auto-detection of expiring roles (< 15 minutes) with red warning color
- 🔲 Notifications at 15min, 5min, 1min before expiration (future enhancement)

**🔲 Quick Extend** (future enhancement)
- One-click extend button next to expiring roles
- "Extend by same duration" or custom duration selector
- Bulk extend multiple roles at once

**✅ Background Monitoring**
- ✅ Auto-refresh active roles list every 30 seconds when on Active Roles tab
- ✅ Filters out expired roles automatically
- 🔲 Browser notification when role is about to expire (future enhancement)

**🔲 Activation History** (future enhancement)
- Show last 50 activations with timestamps
- Filter by date range, role, scope
- Export to CSV for audit purposes

### Technical Implementation Details

**API Endpoints Used:**
- **Entra ID**: `GET /v1.0/roleManagement/directory/roleAssignmentScheduleRequests/filterByCurrentUser(on='principal')`
- **Azure Resources**: `GET /subscriptions/{id}/providers/Microsoft.Authorization/roleAssignmentScheduleRequests?api-version=2020-10-01&$filter=asTarget()`

**Key Features:**
- Parses ISO 8601 duration formats (PT8H, PT30M, PT3H30M)
- Calculates actual endDateTime from startDateTime + duration
- Client-side filtering of expired roles
- Live countdown with hours/minutes/seconds display
- Progress bar animation with color coding (blue → red when expiring)
- Automatic cleanup of DOM elements when cards are removed

---

## 🤖 Automation & DevOps Integration

### Power User Features

**1. CLI Command Generation**
Generate equivalent Azure CLI commands for selected roles:
```bash
# Example generated command
az rest --method PUT \
  --url "https://management.azure.com/subscriptions/.../roleAssignmentScheduleRequests/..." \
  --body '{
    "properties": {
      "principalId": "...",
      "roleDefinitionId": "...",
      "requestType": "SelfActivate",
      "justification": "Production incident response",
      "scheduleInfo": {...}
    }
  }'
```

**2. Script Export**
Export role activation as scripts in multiple formats:
- **PowerShell**: Using Az PowerShell module
- **Bash**: Using Azure CLI
- **Python**: Using Azure SDK
- **Terraform**: As `azurerm_pim_active_role_assignment` resources
- **Bicep**: As ARM template deployment

**3. Webhook Integration**
- POST to custom endpoint on successful activation
- Integration with SIEM (Splunk, Sentinel)
- ChatOps integration (Slack, Teams, Discord)
- Ticketing system auto-update (ServiceNow, Jira)

**4. GitHub Actions Workflow**
Generate `.github/workflows/pim-activation.yml` for automated role activation in CI/CD pipelines.

---

## 🔍 Advanced Token Capabilities

### Leveraging Captured Tokens

**1. API Playground**
- Built-in REST API tester using captured tokens
- Pre-filled auth headers
- Request builder with autocomplete for Azure APIs
- Response formatter and history

**2. Token Decoder Dashboard**
Visual display of decoded JWT token claims:
- **Identity**: UPN, OID, Name, Tenant ID
- **Permissions**: Roles, App Permissions, Scopes
- **Security**: MFA claim, Device ID, IP address
- **Expiration**: Issued at, Expires at, Not before
- **Highlight suspicious claims**: Unusual IP, missing MFA, etc.

**3. Multi-API Token Support**
Capture and utilize tokens for additional Azure APIs:
- Key Vault API (`vault.azure.net`) - Read/write secrets
- Storage API (`storage.azure.com`) - Blob operations
- DevOps API (`dev.azure.com`) - Pipeline triggers
- ARM API - Full resource management
- Use tokens for quick operations without leaving browser

**4. Graph Explorer Integration**
- "Open in Graph Explorer" button
- Pre-populated with captured token
- Deep links to specific API endpoints

---

## 📅 Scheduled & Planned Access

### For Planned Maintenance & On-Call

**Schedule Future Activation**
- "Activate tomorrow at 2 AM UTC" for maintenance windows
- Timezone-aware scheduling
- Confirmation notifications before scheduled activation

**Recurring Activations**
- "Every Monday 9 AM" for weekly on-call rotation
- "First day of month" for billing access
- Cron-like expression support
- Auto-deactivation after scheduled duration

**Calendar Integration**
- Block Outlook/Google Calendar during elevated access
- Show "In PIM session" status
- Automatic meeting decliner during active roles

**Smart Reminders**
- "You have PIM access expiring in 10 minutes"
- "Your scheduled activation starts in 1 hour"
- Browser notifications + email alerts

---

## 🔔 Workflow & Approval Integration

### Current Limitation
No visibility into approval workflows or pending requests.

### Proposed Features

**Pending Approvals Tab**
- See all role activation requests awaiting approval
- Status: Pending, Approved, Denied, Expired
- Filter by requester, role, date

**Approval Actions**
- Approve/deny requests directly from extension
- Add approval comments
- Bulk approve/deny multiple requests

**Approver View**
- Special UI for users with approver privileges
- Notification badge showing pending approval count
- Quick approve with justification review

**Approval History**
- Track who approved what and when
- Approval chain visualization
- Audit trail export

**Request on Behalf**
- Request role activation for another user (delegated access)
- Team lead requesting for team member
- Approval routing to correct manager

---

## 📈 Analytics & Compliance

### Personal & Organizational Insights

**1. Personal Usage Dashboard**
Metrics and visualizations:
- **Most-used roles**: Top 10 activated roles
- **Average activation duration**: Per role analysis
- **Peak usage times**: Heatmap of activation patterns
- **Activation frequency**: Daily/weekly/monthly trends
- **Cost estimation**: If PIM has licensing costs

**2. Audit Export**
- CSV/JSON export of all activations
- Compliance-ready format with timestamps
- Filter by date range, role type, scope
- Scheduled automatic exports

**3. Least Privilege Analysis**
AI-powered recommendations:
- "You activated Owner 5 times but only used Reader-level permissions"
- "Consider downgrading to Contributor for these tasks"
- Suggest minimum required role based on activity patterns

**4. Anomaly Detection**
Security alerts:
- "Unusual: You've never activated Global Admin before"
- "First time activating from this IP address"
- "Activation outside normal business hours"
- "Rapid successive activations (unusual pattern)"

**5. Time Tracking Integration**
- Log PIM session duration to time tracking tools
- Billable hours calculation for consulting work
- Project-based role usage tracking

---

## 🎨 UX Enhancements

### Quick Wins

**✅ Search & Filter** ✅ **IMPLEMENTED (2025-10-29)**
- ✅ Real-time search bar to filter eligible roles instantly
- ✅ Search by role name, subscription, resource group, and scope
- ✅ Filter chips: "All", "Entra ID", "Azure Resource"
- ✅ Clear button (X) appears when search has text
- ✅ Results count display showing "Showing X of Y roles"
- ✅ Keyboard shortcut: Ctrl+F (Cmd+F on Mac) to focus search bar
- ✅ "No results found" message with helpful suggestions
- 🔲 "Favorites" filter chip (future enhancement)
- 🔲 Fuzzy search support (future enhancement)

**Technical Implementation:**
- Client-side filtering for instant results
- Case-insensitive search matching
- Filters by both role name and scope/subscription text
- Styled filter chips with active state highlighting
- Search section with modern, clean design

**🔲 Dark Mode** (future enhancement)
- Full theming support (light/dark/auto)
- Respect system preferences
- Per-component color customization

**Keyboard Shortcuts**
- `Ctrl+A` - Select all roles
- `Ctrl+F` - Focus search bar
- `Ctrl+Enter` - Activate selected roles
- `Esc` - Clear selection
- `Ctrl+D` - Add to favorites
- Arrow keys for navigation

**Role Icons**
Visual distinction for better scanning:
- 🔐 Directory roles
- ☁️ Subscription roles
- 📦 Resource group roles
- 🖥️ Individual resource roles

**Compact/Detail Toggle**
- Compact view: List with checkboxes (current)
- Detail view: Cards with scope, expiration, description
- Grid view: Visual card layout
- Toggle button to switch between views

**Recent Roles Section**
- "You activated these 2 hours ago"
- Quick re-activation button
- Sorted by last activation time

**Role Badges**
- "Favorite" ⭐
- "Active" 🟢
- "Expiring Soon" ⚠️
- "Requires Approval" 👥
- "New" 🆕

---

## 🚨 Emergency Access Features

### Break-Glass Scenarios

**Emergency Mode**
- Big red "EMERGENCY ACCESS" button
- Activates pre-defined emergency role set
- Requires additional confirmation
- Auto-notification to security team

**Incident Response Preset**
- One-click access for P0/Sev1 incidents
- Pre-configured roles: Global Reader, Contributor, Security Reader
- Automatic justification: "P0 Incident #{{ticket}}"
- Incident commander role escalation

**Auto-Notification**
- Alert security team on breakglass activation via email/Teams/Slack
- Include: Who, When, Which roles, Justification
- Require post-incident review

**Session Recording**
- Log all actions during emergency access
- Audit trail for compliance
- Auto-generate incident report

**Time-Boxed Emergency Access**
- Maximum 1-hour duration for emergency roles
- Cannot be extended without approval
- Auto-deactivate on expiry

---

## 🔄 Advanced Activation Scenarios

**1. Conditional Activation**
- "Only activate if role not currently in use by someone else"
- Conflict detection and resolution
- Queue-based access for shared roles

**2. Just-In-Time with Approval**
- Request role + auto-activate when approved
- No manual second step required
- Notification when approved and activated

**3. Delegated Activation**
- Request role activation for another user
- Use case: Manager activating for team member
- Approval routing to correct authority

**4. Role Chaining**
- Dependency detection: "To activate Owner, you need Reader first"
- Auto-suggest prerequisite roles
- One-click activation of role chains

**5. Conditional Access Compliance Check**
- Pre-flight check before activation
- Verify MFA, device compliance, location
- Warn: "This role requires MFA - please authenticate"

---

## 🏗️ Architecture Improvements

### Robustness & Performance

**1. Retry Logic with Exponential Backoff**
- Handle transient API failures gracefully
- Retry 3 times with increasing delays (1s, 2s, 4s)
- Surface error details only after all retries exhausted

**2. Rate Limiting**
- Queue activations to avoid API throttling (429 errors)
- Max 5 concurrent requests
- Smart batching: Group similar requests

**3. Parallel Batch Processing**
- Activate 10 roles concurrently instead of sequentially
- Progress bar showing X of Y completed
- Faster bulk operations

**4. Background Service Worker Optimization**
- Efficient token capture without draining battery
- Lazy loading: Only activate on user interaction
- Memory cleanup for long-running sessions

**5. Error Recovery**
- Save failed activations to local storage
- "Retry Failed" button
- Detailed error messages with troubleshooting links

**6. Offline Mode**
- Cache role data for offline viewing
- Show cached data with "Last updated X mins ago"
- Queue activations for when online

**7. Performance Monitoring**
- Track API response times
- Surface slow endpoints to user
- Internal telemetry for optimization

**8. Intelligent Caching**
- Cache role definitions for 1 hour (current)
- Cache active roles for 1 minute
- Invalidate on manual refresh
- LRU eviction for large datasets

---

## 🎯 Top 5 Most Impactful Features to Build Next

### Prioritized Roadmap

**1. Active Roles Dashboard** ⭐⭐⭐⭐⭐
- **Impact**: Critical visibility gap - users don't know what's active
- **Effort**: Medium (new API calls to list active assignments)
- **Value**: High - prevents accidental over-privilege

**2. Role Favorites/Presets** ⭐⭐⭐⭐⭐
- **Impact**: Massive time saver for repetitive workflows
- **Effort**: Low (UI + local storage)
- **Value**: High - reduces clicks from 10+ to 2

**3. Search & Filter** ⭐⭐⭐⭐
- **Impact**: Essential as users scale to 50+ eligible roles
- **Effort**: Low (client-side filtering)
- **Value**: High - improves discoverability

**4. Token Auto-Refresh** ⭐⭐⭐⭐
- **Impact**: Better reliability, fewer "token expired" errors
- **Effort**: High (complex OAuth flows)
- **Value**: Medium-High - UX improvement

**5. Resource Group/Resource-level Roles** ⭐⭐⭐⭐
- **Impact**: Complete coverage of Azure PIM
- **Effort**: Medium (additional API calls, UI hierarchy)
- **Value**: High - unlocks full PIM functionality

---

## 💡 Implementation Recommendations

### Phase 1: Quick Wins (1-2 weeks)
Focus on high-value, low-effort features:
- ✅ Add search/filter functionality
- ✅ Show active roles with countdown timers
- ✅ Add role favorites/presets
- ✅ Implement dark mode
- ✅ Keyboard shortcuts

**Expected Impact**: 5x faster workflow for power users

### Phase 2: Power Features (1 month)
Mid-effort, high-value enhancements:
- ✅ Token auto-refresh logic
- ✅ Complete resource hierarchy (Management Groups, Resource Groups, Resources)
- ✅ CLI command generation
- ✅ Scheduled activations
- ✅ Bulk operations (Deactivate All, Extend All)

**Expected Impact**: Professional-grade tool, ready for enterprise adoption

### Phase 3: Enterprise Features (2-3 months)
High-effort, transformative capabilities:
- ✅ Approval workflow integration
- ✅ Audit/compliance exports
- ✅ Multi-tenant support
- ✅ Analytics dashboard
- ✅ Webhook integrations
- ✅ Emergency access mode

**Expected Impact**: Enterprise-ready, compliance-friendly, full-featured PIM client

### Phase 4: Advanced & Experimental (Ongoing)
Exploratory features based on user feedback:
- API Playground
- Token decoder dashboard
- Least privilege analysis
- AI-powered recommendations
- Cross-cloud support (AWS IAM, GCP IAM)

---

## 🔮 Long-term Vision

### QuickPIM as a Platform

**Browser Extension Ecosystem**
- Core: PIM role management
- Extensions: Key Vault quick-access, Storage browser, Graph Explorer
- Plugin architecture for community contributions

**Cross-Cloud Support**
- AWS IAM Identity Center integration
- GCP Privileged Access Management
- Unified interface for multi-cloud environments

**Team Collaboration**
- Shared presets and templates
- Role request delegation
- Approval workflows
- Audit log sharing

**AI-Powered Assistance**
- "I need to debug a production issue in West Europe" → Auto-suggest required roles
- Natural language queries: "Activate my database admin role for 2 hours"
- Predictive activation: "You usually activate this on Fridays"

**Compliance & Governance**
- Zero-trust verification before activation
- Automated least-privilege enforcement
- Real-time policy violation detection
- Integration with Azure Policy and Defender for Cloud

---

## 📝 Contributing Ideas

Have more ideas? We'd love to hear them!

- Open an issue with tag `enhancement`
- Join discussions in GitHub Discussions
- Submit a PR with proof-of-concept

**Priority**: Features that improve security, reduce clicks, or enable automation.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Maintainer**: QuickPIM Team
