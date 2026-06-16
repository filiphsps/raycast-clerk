import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useApps } from "./lib/hooks";
import { getActiveAppId, setActiveAppId, getApps } from "./lib/storage";
import { AuthGuard } from "./components/auth-guard";
import { clientFor } from "./lib/clerk";
import type { ClerkApp } from "./types";

type Row = { app: ClerkApp; users: number; orgs: number; error: boolean };

export default function Overview() {
  const { data: apps = [], isLoading: appsLoading, revalidate: revalidateApps } = useApps();
  const { data, isLoading, revalidate } = useCachedPromise(
    async () => {
      const list = await getApps();
      const activeId = await getActiveAppId();
      const rows: Row[] = await Promise.all(
        list.map(async (app) => {
          try {
            const [u, o] = await Promise.all([
              clientFor(app).users.getUserList({ limit: 1 }),
              clientFor(app).organizations.getOrganizationList({ limit: 1 }),
            ]);
            return { app, users: u.totalCount, orgs: o.totalCount, error: false };
          } catch {
            return { app, users: 0, orgs: 0, error: true };
          }
        }),
      );
      return { rows, activeId };
    },
    [],
    { initialData: { rows: [], activeId: undefined } },
  );

  async function activate(app: ClerkApp) {
    await setActiveAppId(app.id);
    revalidate();
    await showToast({ style: Toast.Style.Success, title: `Active app: ${app.name}` });
  }

  if (appsLoading) return <List isLoading />;
  if (apps.length === 0) return <AuthGuard onChanged={revalidateApps} />;

  return (
    <List isLoading={isLoading}>
      {data.rows.map(({ app, users, orgs, error }) => (
        <List.Item
          key={app.id}
          icon={app.id === data.activeId ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          title={app.name}
          subtitle={app.instanceType}
          accessories={
            error
              ? [{ tag: { value: "Error", color: Color.Red } }]
              : [
                  { text: `${users} users` },
                  { text: `${orgs} orgs` },
                  ...(app.id === data.activeId ? [{ tag: { value: "Active", color: Color.Green } }] : []),
                ]
          }
          actions={
            <ActionPanel>
              <Action title="Set as Active" icon={Icon.Check} onAction={() => activate(app)} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
