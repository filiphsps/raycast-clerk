import { environment, Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { DASHBOARD_BASE } from "./lib/clerk";
import {
  getApps,
  getActiveAppId,
  setActiveAppId,
  getMenuBarHidden,
  setMenuBarHidden,
  getMenuBarTitleMode,
  setMenuBarTitleMode,
} from "./lib/storage";

async function safeLaunch(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch {
    // Command may be disabled by the user; ignore.
  }
}

export default function MenuBar() {
  const { data: apps = [], isLoading: appsLoading } = useCachedPromise(getApps, [], { initialData: [] });
  const {
    data: activeId,
    isLoading: activeLoading,
    revalidate: revalidateActive,
  } = useCachedPromise(getActiveAppId, []);
  const {
    data: titleMode = "full",
    isLoading: titleLoading,
    revalidate: revalidateTitle,
  } = useCachedPromise(getMenuBarTitleMode, []);

  // Running the command from Raycast's root search toggles enabled/disabled.
  const [hidden, setHidden] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    (async () => {
      if (environment.launchType === LaunchType.UserInitiated) {
        const next = !(await getMenuBarHidden());
        await setMenuBarHidden(next);
        setHidden(next);
      } else {
        setHidden(await getMenuBarHidden());
      }
    })();
  }, []);

  const loading = appsLoading || activeLoading || titleLoading || hidden === undefined;

  // Disabled — remove the item from the menu bar. Run the command again to re-enable.
  if (!loading && hidden) return null;

  const activeApp = apps.find((a) => a.id === activeId);
  const title = titleMode === "icon" ? undefined : activeApp?.name;

  async function activate(id: string) {
    await setActiveAppId(id);
    revalidateActive();
  }

  async function toggleTitle() {
    await setMenuBarTitleMode(titleMode === "icon" ? "full" : "icon");
    revalidateTitle();
  }

  async function disable() {
    await setMenuBarHidden(true);
    setHidden(true);
  }

  const settingsSection = (
    <MenuBarExtra.Section title="Menu Bar">
      <MenuBarExtra.Item
        title={titleMode === "icon" ? "Show Title" : "Show Icon Only"}
        icon={Icon.Text}
        onAction={toggleTitle}
      />
      <MenuBarExtra.Item title="Disable Menu Bar" icon={Icon.EyeDisabled} onAction={disable} />
    </MenuBarExtra.Section>
  );

  return (
    <MenuBarExtra icon={Icon.Key} title={title} tooltip="Clerk" isLoading={loading}>
      {apps.length === 0 ? (
        <>
          <MenuBarExtra.Item title="Add Clerk App…" icon={Icon.Plus} onAction={() => safeLaunch("manage-apps")} />
          {settingsSection}
        </>
      ) : (
        <>
          <MenuBarExtra.Section title="Switch App">
            {apps.map((app) => (
              <MenuBarExtra.Item
                key={app.id}
                title={app.name}
                icon={app.id === activeId ? Icon.Checkmark : undefined}
                onAction={() => activate(app.id)}
              />
            ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Commands">
            <MenuBarExtra.Item title="Search Users" icon={Icon.Person} onAction={() => safeLaunch("search-users")} />
            <MenuBarExtra.Item
              title="Search Organizations"
              icon={Icon.Building}
              onAction={() => safeLaunch("search-organizations")}
            />
            <MenuBarExtra.Item title="Manage Apps" icon={Icon.Gear} onAction={() => safeLaunch("manage-apps")} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Open Clerk Dashboard" icon={Icon.Globe} onAction={() => open(DASHBOARD_BASE)} />
          </MenuBarExtra.Section>
          {settingsSection}
        </>
      )}
    </MenuBarExtra>
  );
}
