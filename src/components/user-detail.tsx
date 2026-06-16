import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { ClerkApp } from "../types";
import { clientFor, dashboardUserUrl } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { primaryEmail, fullName } from "../lib/user";
import { EditUserForm } from "./user-edit-form";
import { AddEmailForm } from "./add-email-form";
import { SignInTokenForm } from "./sign-in-token-form";
import { ImpersonationTokenForm } from "./impersonation-token-form";

function fmtDate(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : "—";
}

export function UserSessions(props: { app: ClerkApp; userId: string }) {
  const { data, isLoading, mutate } = useCachedPromise(
    async (userId: string) => {
      const res = await clientFor(props.app).sessions.getSessionList({ userId });
      return res.data;
    },
    [props.userId],
    { onError: showClerkError },
  );

  async function revoke(sessionId: string) {
    await mutate(clientFor(props.app).sessions.revokeSession(sessionId));
  }

  return (
    <List isLoading={isLoading} navigationTitle="Sessions">
      {(data ?? []).map((s) => (
        <List.Item
          key={s.id}
          icon={Icon.Globe}
          title={s.id}
          accessories={[{ tag: s.status }, { date: new Date(s.lastActiveAt) }]}
          actions={
            <ActionPanel>
              <Action
                title="Revoke Session"
                style={Action.Style.Destructive}
                icon={Icon.XMarkCircle}
                onAction={() => revoke(s.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function UserDetail(props: { app: ClerkApp; userId: string }) {
  const {
    data: user,
    isLoading,
    revalidate,
  } = useCachedPromise(async (userId: string) => clientFor(props.app).users.getUser(userId), [props.userId], {
    onError: showClerkError,
  });

  const md = user ? `# ${fullName(user)}\n\n${user.imageUrl ? `![avatar](${user.imageUrl})` : ""}` : "Loading…";

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      navigationTitle={user ? fullName(user) : "User"}
      metadata={
        user && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="User ID" text={user.id} />
            <Detail.Metadata.Label title="Email" text={primaryEmail(user)} />
            <Detail.Metadata.Label title="Username" text={user.username ?? "—"} />
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={user.banned ? "Banned" : "Active"}
                color={user.banned ? Color.Red : Color.Green}
              />
              {user.twoFactorEnabled && <Detail.Metadata.TagList.Item text="2FA" color={Color.Blue} />}
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Created" text={fmtDate(user.createdAt)} />
            <Detail.Metadata.Label title="Last sign-in" text={fmtDate(user.lastSignInAt)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Public metadata" text={JSON.stringify(user.publicMetadata)} />
            <Detail.Metadata.Label title="Private metadata" text={JSON.stringify(user.privateMetadata)} />
          </Detail.Metadata>
        )
      }
      actions={
        user && (
          <ActionPanel>
            <Action.Push
              title="Edit User"
              icon={Icon.Pencil}
              target={<EditUserForm app={props.app} user={user} onSaved={revalidate} />}
            />
            <Action.Push
              title="Add Email Address"
              icon={Icon.Envelope}
              target={<AddEmailForm app={props.app} userId={user.id} onAdded={revalidate} />}
            />
            <Action.Push
              title="View Sessions"
              icon={Icon.Globe}
              target={<UserSessions app={props.app} userId={user.id} />}
            />
            <Action.OpenInBrowser title="Open in Clerk Dashboard" icon={Icon.Globe} url={dashboardUserUrl(user.id)} />
            <Action.CopyToClipboard title="Copy User ID" content={user.id} />
            <Action.CopyToClipboard title="Copy Email" content={primaryEmail(user)} />
            <ActionPanel.Section title="Support">
              <Action.Push
                title="Generate Sign-In Token"
                icon={Icon.Key}
                target={<SignInTokenForm app={props.app} userId={user.id} />}
              />
              <Action.Push
                title="Generate Impersonation Token"
                icon={Icon.TwoPeople}
                target={<ImpersonationTokenForm app={props.app} userId={user.id} />}
              />
            </ActionPanel.Section>
          </ActionPanel>
        )
      }
    />
  );
}
