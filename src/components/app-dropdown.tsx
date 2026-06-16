import { List } from "@raycast/api";
import type { ClerkApp } from "../types";

export function AppDropdown(props: { apps: ClerkApp[]; selectedId: string; onChange: (id: string) => void }) {
  if (props.apps.length < 2) return null;
  return (
    <List.Dropdown tooltip="Active App" value={props.selectedId} onChange={props.onChange}>
      {props.apps.map((app) => (
        <List.Dropdown.Item key={app.id} title={app.name} value={app.id} />
      ))}
    </List.Dropdown>
  );
}
