import { db } from '../../db/db';
import { saveSettings } from '../../db/repo';
import type { E1rmFormula, Unit } from '../../domain/types';
import { useSettings } from '../../hooks/useData';
import { useTheme, type ThemePref } from '../../hooks/useTheme';
import { Card, Checkbox, FieldRow, Segmented } from '../ui';

export function PreferencesCard() {
  const settings = useSettings();
  const [theme, setTheme] = useTheme();
  return (
    <Card title="Preferences">
      <FieldRow
        label="Default weight unit"
        hint="Used for exercises without their own unit, and for totals across exercises."
      >
        <Segmented<Unit>
          label="Default unit"
          value={settings.defaultUnit}
          onChange={(defaultUnit) => void saveSettings(db, { defaultUnit })}
          options={[
            { id: 'lb', label: 'lb' },
            { id: 'kg', label: 'kg' },
          ]}
        />
      </FieldRow>
      <FieldRow
        label="1RM formula"
        hint="Epley suits most rep ranges; Brzycki reads lower at high reps."
      >
        <Segmented<E1rmFormula>
          label="1RM formula"
          value={settings.e1rmFormula}
          onChange={(e1rmFormula) => void saveSettings(db, { e1rmFormula })}
          options={[
            { id: 'epley', label: 'Epley' },
            { id: 'brzycki', label: 'Brzycki' },
          ]}
        />
      </FieldRow>
      <FieldRow
        label="Secondary muscle credit"
        hint="How much a set counts toward secondary muscles."
      >
        <Segmented
          label="Secondary muscle credit"
          value={String(settings.secondaryWeight)}
          onChange={(v) => void saveSettings(db, { secondaryWeight: Number(v) })}
          options={[
            { id: '0', label: '0' },
            { id: '0.5', label: '½' },
            { id: '1', label: '1' },
          ]}
        />
      </FieldRow>
      <FieldRow label="Warm-up sets" hint="Excluded from volume, set counts and PRs by default.">
        <Checkbox
          checked={settings.includeWarmups}
          onChange={(includeWarmups) => void saveSettings(db, { includeWarmups })}
        >
          Include
        </Checkbox>
      </FieldRow>
      <FieldRow label="Theme">
        <Segmented<ThemePref>
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { id: 'system', label: 'System' },
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
          ]}
        />
      </FieldRow>
    </Card>
  );
}
