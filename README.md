# Clerk

Browse and lightly administer Clerk users and organizations across multiple, switchable Clerk instances, directly from Raycast.

## Commands

- **Manage Apps** — add/edit/remove Clerk instances and pick the active one. Open the Clerk dashboard, copy a secret key, and add it (auto-detected from your clipboard).
- **Switch Active App** — quickly change which instance is active.
- **Search Users** — search users, view details and sessions, ban/unban, revoke sessions, delete, view a user's organizations, **create users**, **edit users** (name, username, primary email, public/private metadata), **add email addresses**, and generate **sign-in / impersonation tokens**.
- **Search Organizations** — search organizations, view/manage members (change role, remove), create and delete organizations, **edit organizations** (name, slug, public/private metadata), and manage **organization invitations** (create with a role, revoke).
- **Clerk Menu Bar** — optional menu-bar item showing the active instance, with quick app switching and command launchers.
- **Invitations** — list, create (with expiry, redirect URL, and email toggle), and revoke instance invitations.
- **Access Lists** — manage allowlist and blocklist identifiers (toggle via the search-bar dropdown).
- **Overview** — user and organization counts for every configured instance, with quick "Set as Active".

In **Search Users** and **Search Organizations**, when you have more than one instance configured, a dropdown in the top-right of the search bar switches the active instance in place. User and organization rows include **Open in Clerk Dashboard**.

## Authentication

Each "app" is a Clerk **instance**, identified by its secret key (`sk_live_…` / `sk_test_…`) from the [API keys page](https://dashboard.clerk.com/last-active?path=api-keys). A Clerk secret key is scoped to a single instance; there is no public API to list your applications, so instances are added manually.

## Security note

Secret keys are stored in Raycast **LocalStorage**, which is local to your machine but **not encrypted at rest**. Keys are only sent to `api.clerk.com`. Remove an app from **Manage Apps** to delete its stored key.

**Open in Clerk Dashboard** uses Clerk's `~` (last-active instance) deep links. The dashboard opens whichever instance was last active in your browser, which may differ from the instance active in this extension if you manage more than one — there is no public API to map a secret key to a dashboard instance.

**Editing metadata** replaces the entire public/private metadata object with the JSON you enter (it is not a deep merge). Leave a metadata field blank to clear it.

**Generated tokens are secrets.** Sign-in and impersonation tokens (and their URLs) grant access to sign in as the user — treat the copied values like passwords.
