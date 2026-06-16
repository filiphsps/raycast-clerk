import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import type { Organization } from "@clerk/backend";
import { useApps, PAGE_SIZE } from "./lib/hooks";
import { getActiveAppId, setActiveAppId } from "./lib/storage";
import { AuthGuard } from "./components/auth-guard";
import { AppDropdown } from "./components/app-dropdown";
import { OrgMembers } from "./components/org-members";
import { OrgInvitations } from "./components/org-invitations";
import { EditOrgForm } from "./components/org-edit-form";
import { clientFor, dashboardOrgUrl } from "./lib/clerk";
import { getPageParams, computeHasMore } from "./lib/pagination";
import { showClerkError } from "./lib/errors";
import type { ClerkApp } from "./types";

function CreateOrgForm({ app, onDone }: { app: ClerkApp; onDone: () => void }) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  async function submit() {
    if (!name.trim() || !createdBy.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name and Created-by user ID are required" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating organization" });
    try {
      await clientFor(app).organizations.createOrganization({
        name: name.trim(),
        slug: slug.trim() || undefined,
        createdBy: createdBy.trim(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Organization created";
      onDone();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Organization" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.TextField id="slug" title="Slug (optional)" value={slug} onChange={setSlug} />
      <Form.TextField
        id="createdBy"
        title="Created by (user ID)"
        placeholder="user_…"
        value={createdBy}
        onChange={setCreatedBy}
      />
      <Form.Description text="Clerk requires the user ID of the creator." />
    </Form>
  );
}

function OrgsList({ app, accessory }: { app: ClerkApp; accessory?: List.Props["searchBarAccessory"] }) {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, pagination, mutate } = useCachedPromise(
    (appId: string, query: string) => async (options: { page: number }) => {
      const { limit, offset } = getPageParams(options.page, PAGE_SIZE);
      const res = await clientFor(app).organizations.getOrganizationList({
        query: query || undefined,
        limit,
        offset,
      });
      return { data: res.data, hasMore: computeHasMore(offset, res.data.length, res.totalCount) };
    },
    [app.id, searchText],
    { onError: showClerkError },
  );

  async function del(org: Organization) {
    const ok = await confirmAlert({
      title: `Delete ${org.name}?`,
      message: "This permanently deletes the organization in Clerk.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${org.name}` });
    try {
      await mutate(clientFor(app).organizations.deleteOrganization(org.id), {
        optimisticUpdate: (list) => list.filter((o) => o.id !== org.id),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Organization deleted";
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
      searchBarPlaceholder="Search organizations…"
      searchBarAccessory={accessory}
    >
      {(data ?? []).map((org) => (
        <List.Item
          key={org.id}
          icon={org.imageUrl ? { source: org.imageUrl } : Icon.Building}
          title={org.name}
          subtitle={org.slug ?? undefined}
          accessories={[
            ...(typeof org.membersCount === "number" ? [{ text: `${org.membersCount} members` }] : []),
            { date: new Date(org.createdAt), tooltip: "Created" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Members"
                icon={Icon.PersonLines}
                target={<OrgMembers app={app} organizationId={org.id} orgName={org.name} />}
              />
              <Action.Push
                title="View Invitations"
                icon={Icon.Envelope}
                target={<OrgInvitations app={app} organizationId={org.id} orgName={org.name} />}
              />
              <Action.Push
                title="Edit Organization"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditOrgForm app={app} organizationId={org.id} onSaved={() => mutate()} />}
              />
              <Action.Push
                title="Create Organization"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={<CreateOrgForm app={app} onDone={() => mutate()} />}
              />
              <Action
                title="Delete Organization"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => del(org)}
              />
              <Action.OpenInBrowser title="Open in Clerk Dashboard" icon={Icon.Globe} url={dashboardOrgUrl(org.id)} />
              <Action.CopyToClipboard title="Copy Org ID" content={org.id} />
              {org.slug && <Action.CopyToClipboard title="Copy Slug" content={org.slug} />}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function SearchOrganizations() {
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

  return <OrgsList app={app} accessory={<AppDropdown apps={apps} selectedId={app.id} onChange={onAppChange} />} />;
}
