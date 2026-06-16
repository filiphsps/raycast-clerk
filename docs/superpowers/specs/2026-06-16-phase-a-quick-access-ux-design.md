# Phase A — Quick-access UX Design Spec

- **Date:** 2026-06-16
- **Status:** Approved (ready for implementation planning)
- **Owner:** filiph
- **Builds on:** the base extension (`2026-06-16-clerk-raycast-extension-design.md`)

## 1. Purpose

Make day-to-day use of the Clerk extension faster: see and switch the active
instance without leaving what you're doing, and jump to the Clerk dashboard for
a specific user or organization. This is the first of four planned phases
(A: quick-access UX, B: admin power, C: invitations & access, D: support tooling).

## 2. Scope

Three self-contained sub-features:

1. **Menu-bar command** — an opt-in `MenuBarExtra` showing the active app, with
   in-menu app switching and command launchers.
2. **Inline app-switcher** — a `searchBarAccessory` dropdown in Search Users and
   Search Organizations that switches the active instance and refetches in place.
3. **"Open in Clerk Dashboard" deep links** — actions on users and organizations
   that open the corresponding dashboard page.

Tooling note: the project uses **npm** (`npm test`, `npm run build`,
`npm run lint`). Not pnpm.

## 3. Shared helpers (`src/lib/clerk.ts`)

Add dashboard deep-link helpers next to `DASHBOARD_API_KEYS_URL`:

```ts
export const DASHBOARD_BASE = "https://dashboard.clerk.com";
export function dashboardUserUrl(userId: string): string; // `${DASHBOARD_BASE}/~/users/${userId}`
export function dashboardOrgUrl(orgId: string): string;    // `${DASHBOARD_BASE}/~/organizations/${orgId}`
```

`~` resolves to the dashboard's **last-active instance**, which may differ from
the app active in Raycast (there is no public way to map a secret key → dashboard
instance ID). For single-app users this is exact; with multiple apps it can land
on the wrong instance. Documented as a known limitation in the README.

## 4. Menu-bar command (`src/menubar.tsx`)

Manifest entry: `{ name: "menubar", title: "Clerk Menu Bar", description: "Show the active Clerk app and switch instances from the menu bar", mode: "menu-bar" }`.
No `interval` (data is read from LocalStorage when the menu opens).

Data: `useCachedPromise(getApps)` and `useCachedPromise(getActiveAppId)`.

Render (`MenuBarExtra`):

- `icon` = a Clerk/key icon; `title` = the active app's name (omitted when none).
- `isLoading` bound to the hooks' loading state.
- **No apps configured:** a single item **"Add Clerk App…"** that runs
  `launchCommand({ name: "manage-apps", type: LaunchType.UserInitiated })`.
- **Apps configured:**
  - `MenuBarExtra.Section title="Switch App"` — one
    `MenuBarExtra.Item` per app; the active one uses an `Icon.Checkmark` icon;
    `onAction` calls `setActiveAppId(app.id)`. (Raycast re-renders the menu on
    next open; no manual revalidate needed.)
  - `MenuBarExtra.Section title="Commands"` — items **Search Users**,
    **Search Organizations**, **Manage Apps**, each `launchCommand({...})`.
  - `MenuBarExtra.Item title="Open Clerk Dashboard"` → `open(DASHBOARD_API_KEYS_URL)`
    (or `DASHBOARD_BASE`). Use `DASHBOARD_BASE` so it lands on the dashboard home.

Errors: menu-bar commands cannot show toasts reliably; failures from
`launchCommand`/`open` are caught and ignored (best-effort), which is acceptable
for these actions.

## 5. Inline app-switcher

New component `src/components/app-dropdown.tsx`:

```tsx
export function AppDropdown(props: {
  apps: ClerkApp[];
  selectedId: string;
  onChange: (id: string) => void;
}): JSX.Element | null;
```

- Returns `null` when `apps.length < 2` (a dropdown is redundant with one app).
- Otherwise renders a `List.Dropdown` (`tooltip="Active App"`,
  `value={selectedId}`, `onChange={onChange}`) with one
  `List.Dropdown.Item` per app (`title={app.name}`, `value={app.id}`).

### Refactor of Search Users (`src/search-users.tsx`)

The command owns app-selection state so switching can happen in place:

- Load `const { data: apps = [], isLoading: appsLoading } = useApps();`
  and the active id via `useCachedPromise(getActiveAppId)`.
- Local state `selectedId`, initialized from the active id once loaded
  (fall back to `apps[0]?.id`).
- While loading → `<List isLoading />`. If `apps.length === 0` →
  `<AuthGuard onChanged={...} />`.
- Resolve `const app = apps.find((a) => a.id === selectedId) ?? apps[0];`
  and render `<UsersList app={app} accessory={<AppDropdown .../>} />`.
- `onChange` from the dropdown: `setSelectedId(id)` **and**
  `setActiveAppId(id)` (persist so the menu bar / other commands stay in sync).
- `UsersList` accepts an optional `accessory?: ReactNode` prop and passes it to
  `<List searchBarAccessory={accessory}>`. **Its `useCachedPromise` dependency
  array must include `app.id`** — change it from `[searchText]` to
  `[app.id, searchText]`. Without this, swapping the `app` prop re-renders the
  component but does not refetch (the hook only re-runs when its deps change).

### Refactor of Search Organizations (`src/search-organizations.tsx`)

Identical pattern: `OrgsList` accepts `accessory?: ReactNode` →
`<List searchBarAccessory={accessory}>` and changes its `useCachedPromise` deps
from `[searchText]` to `[app.id, searchText]`; `SearchOrganizations` owns
`selectedId`, renders `AppDropdown`, persists via `setActiveAppId`.

## 6. "Open in Clerk Dashboard" actions

Add `Action.OpenInBrowser` (icon `Icon.Globe`, a `cmd+shift+,`-style shortcut is
optional) wired to the helpers from §3:

- **Search Users** list items and **User Detail** → `dashboardUserUrl(user.id)`.
- **Search Organizations** list items and **Org Members** header context (on the
  org) → `dashboardOrgUrl(org.id)`. For Org Members, the org id is already passed
  in as `organizationId`, so add the action to that screen's primary
  `ActionPanel` (e.g., via a top-level action) using `dashboardOrgUrl(organizationId)`.

## 7. Files

- **New:** `src/menubar.tsx`, `src/components/app-dropdown.tsx`.
- **Modified:**
  - `src/lib/clerk.ts` — add `DASHBOARD_BASE`, `dashboardUserUrl`, `dashboardOrgUrl`.
  - `src/lib/clerk.test.ts` — unit tests for the two URL helpers.
  - `src/search-users.tsx` — app-selection state + dropdown + open-in-dashboard.
  - `src/components/user-detail.tsx` — open-in-dashboard action.
  - `src/search-organizations.tsx` — app-selection state + dropdown + open-in-dashboard.
  - `src/components/org-members.tsx` — open-in-dashboard action for the org.
  - `package.json` — add the `menubar` command.
  - `README.md` — document the menu-bar command, inline switcher, and the
    dashboard deep-link "last-active instance" caveat.

## 8. Testing

- **Unit (vitest):** `dashboardUserUrl` and `dashboardOrgUrl` produce the exact
  expected URLs.
- **Manual (`npm run dev`):**
  - Menu bar: shows active app name; switching updates it and the other commands;
    "Add Clerk App…" appears when none configured; command launchers open the
    right commands.
  - Inline switcher: appears only with 2+ apps; changing it refetches users/orgs
    in place and is reflected in Switch Active App and the menu bar.
  - Open-in-dashboard opens the correct page for single-app setups.

## 9. Out of scope (this phase)

- Phases B–D (admin power, invitations/access, support tooling).
- Forcing the dashboard to a specific instance (not possible via public API).
- A background refresh interval for the menu bar.
