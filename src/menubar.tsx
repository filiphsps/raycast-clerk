import { Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { DASHBOARD_BASE } from "./lib/clerk";
import { getApps, getActiveAppId, setActiveAppId } from "./lib/storage";

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

  const activeApp = apps.find((a) => a.id === activeId);

  async function activate(id: string) {
    await setActiveAppId(id);
    revalidateActive();
  }

  return (
    <MenuBarExtra icon={Icon.Key} title={activeApp?.name} isLoading={appsLoading || activeLoading}>
      {apps.length === 0 ? (
        <MenuBarExtra.Item title="Add Clerk App…" icon={Icon.Plus} onAction={() => safeLaunch("manage-apps")} />
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
        </>
      )}
    </MenuBarExtra>
  );
}
