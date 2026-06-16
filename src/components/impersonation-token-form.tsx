import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { ClerkApp } from "../types";
import { clientFor } from "../lib/clerk";
import { showClerkError } from "../lib/errors";
import { parsePositiveIntOrUndefined } from "../lib/parse";
import { TokenResultDetail } from "./token-result";

export function ImpersonationTokenForm({ app, userId }: { app: ClerkApp; userId: string }) {
  const { push } = useNavigation();
  const [actorSub, setActorSub] = useState("");
  const [expiresInSeconds, setExpiresInSeconds] = useState("");
  const [sessionMax, setSessionMax] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!actorSub.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Actor user ID is required" });
      return;
    }
    let expires: number | undefined;
    let sessionMaxDuration: number | undefined;
    try {
      expires = parsePositiveIntOrUndefined(expiresInSeconds);
      sessionMaxDuration = parsePositiveIntOrUndefined(sessionMax);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Durations must be positive whole numbers" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating impersonation token" });
    try {
      const t = await clientFor(app).actorTokens.create({
        userId,
        actor: { sub: actorSub.trim() },
        expiresInSeconds: expires,
        sessionMaxDurationInSeconds: sessionMaxDuration,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Impersonation token created";
      push(
        <TokenResultDetail
          title="Impersonation Token"
          urlLabel="Impersonation URL"
          url={t.url ?? ""}
          token={t.token ?? ""}
          status={t.status}
        />,
      );
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Impersonation Token" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="actorSub"
        title="Actor User ID"
        placeholder="user_… (who is impersonating)"
        value={actorSub}
        onChange={setActorSub}
      />
      <Form.TextField
        id="expiresInSeconds"
        title="Expires in Seconds"
        placeholder="optional (default 1h)"
        value={expiresInSeconds}
        onChange={setExpiresInSeconds}
      />
      <Form.TextField
        id="sessionMax"
        title="Session Max Duration (seconds)"
        placeholder="optional (default 30m)"
        value={sessionMax}
        onChange={setSessionMax}
      />
    </Form>
  );
}
