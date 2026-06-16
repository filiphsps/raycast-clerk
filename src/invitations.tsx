import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import type { Invitation } from "@clerk/backend";
import { useApps, PAGE_SIZE } from "./lib/hooks";
import { getActiveAppId, setActiveAppId } from "./lib/storage";
import { AuthGuard } from "./components/auth-guard";
import { AppDropdown } from "./components/app-dropdown";
import { InvitationCreateForm } from "./components/invitation-create-form";
import { clientFor } from "./lib/clerk";
import { getPageParams, computeHasMore } from "./lib/pagination";
import { showClerkError } from "./lib/errors";
import type { ClerkApp } from "./types";

function statusColor(status: Invitation["status"]): Color {
  if (status === "accepted") return Color.Green;
  if (status === "revoked" || status === "expired") return Color.Red;
  return Color.Yellow;
}

function InvitationsList({ app, accessory }: { app: ClerkApp; accessory?: List.Props["searchBarAccessory"] }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (appId: string, query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(app).invitations.getInvitationList({
        query: query || undefined,
        orderBy: "-created_at",
        limit,
        offset,
      });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [app.id, searchText],
    { onError: showClerkError },
  );

  async function revoke(inv: Invitation) {
    const ok = await confirmAlert({
      title: `Revoke invitation to ${inv.emailAddress}?`,
      primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Revoking invitation" });
    try {
      await mutate(clientFor(app).invitations.revokeInvitation(inv.id));
      toast.style = Toast.Style.Success;
      toast.title = "Invitation revoked";
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search invitations…"
      searchBarAccessory={accessory}
    >
      {(data ?? []).map((inv) => (
        <List.Item
          key={inv.id}
          icon={Icon.Envelope}
          title={inv.emailAddress}
          accessories={[
            { tag: { value: inv.status, color: statusColor(inv.status) } },
            { date: new Date(inv.createdAt), tooltip: "Created" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Invitation"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<InvitationCreateForm app={app} onSaved={() => mutate()} />}
              />
              {inv.status === "pending" && (
                <Action
                  title="Revoke Invitation"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => revoke(inv)}
                />
              )}
              {inv.url && <Action.CopyToClipboard title="Copy Invitation URL" content={inv.url} />}
              <Action.CopyToClipboard title="Copy Email" content={inv.emailAddress} />
              <Action.CopyToClipboard title="Copy ID" content={inv.id} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Invitations() {
  const { data: apps = [], isLoading: appsLoading, revalidate } = useApps();
  const { data: activeId, isLoading: activeLoading } = useCachedPromise(getActiveAppId, []);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (selectedId === undefined && activeId) setSelectedId(activeId);
  }, [activeId, selectedId]);

  if (appsLoading || activeLoading) return <List isLoading />;
  if (apps.length === 0) return <AuthGuard onChanged={revalidate} />;

  const app = apps.find((a) => a.id === selectedId) ?? apps[0];

  function onAppChange(id: string) {
    setSelectedId(id);
    setActiveAppId(id);
  }

  return (
    <InvitationsList app={app} accessory={<AppDropdown apps={apps} selectedId={app.id} onChange={onAppChange} />} />
  );
}
