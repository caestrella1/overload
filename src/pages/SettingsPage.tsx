import { AliasesCard } from '../components/settings/AliasesCard';
import { BackupCard } from '../components/settings/BackupCard';
import { ClearDataCard } from '../components/settings/ClearDataCard';
import { DuplicatesCard } from '../components/settings/DuplicatesCard';
import { FormatsCard } from '../components/settings/FormatsCard';
import { PreferencesCard } from '../components/settings/PreferencesCard';
import { ProfileCard } from '../components/settings/ProfileCard';
import { StorageCard } from '../components/settings/StorageCard';
import { PageHeader } from '../components/ui';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Preferences and data are stored only in this browser."
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <ProfileCard />
          <PreferencesCard />
        </div>
        <div className="min-w-0 space-y-6">
          <StorageCard />
          <FormatsCard />
          <AliasesCard />
          <DuplicatesCard />
          <BackupCard />
          <ClearDataCard />
        </div>
      </div>
    </>
  );
}
