import { ImportHistory } from '../components/import/ImportHistory';
import { ImportPreview } from '../components/import/ImportPreview';
import { MappingStep } from '../components/import/MappingStep';
import { Button, Callout, Card, FileDropzone, PageHeader, TextLink } from '../components/ui';
import type { ImportRecord } from '../domain/types';
import { formatNumber } from '../domain/units';
import { useSettings } from '../hooks/useData';
import { useImportFlow } from '../hooks/useImportFlow';
import { IMPORTERS } from '../importers';
import { SampleDataBanner } from '../components/SampleDataBanner';
import { SAMPLE_FILE_NAME } from '../demo/sampleName';

/** "Added 120 sets, updated 3, removed 8, skipped 2,900 already stored." */
function importSummary(record: ImportRecord): string {
  const parts = [`Added ${formatNumber(record.added, 0)} sets`];
  if (record.updated) parts.push(`updated ${formatNumber(record.updated, 0)}`);
  if (record.removed) parts.push(`removed ${formatNumber(record.removed, 0)}`);
  if (record.duplicates) parts.push(`skipped ${formatNumber(record.duplicates, 0)} already stored`);
  return `${parts.join(', ')}.`;
}

export default function ImportPage() {
  const settings = useSettings();
  const { state, load, loadFile, updateDraft, applyMapping, commit, reset } = useImportFlow(
    settings.defaultUnit,
  );

  const loadSample = async () => {
    // Loaded on demand so the generator isn't in the main bundle.
    const { generateSampleCsv } = await import('../demo/sampleData');
    await load(SAMPLE_FILE_NAME, generateSampleCsv());
  };

  return (
    <>
      <PageHeader
        title="Import"
        subtitle={`${IMPORTERS.map((i) => i.label).join(', ')} exports import straight away; any other CSV can be mapped column by column. Files are processed in your browser and never uploaded.`}
      />

      <SampleDataBanner />
      <Card className="mb-6">
        <FileDropzone
          accept=".csv,text/csv"
          onFile={(f) => void loadFile(f)}
          title="Drop a CSV here, or click to choose"
          hint="In Strong: Settings → Export Strong Data. Re-importing a newer export only adds what's new."
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
          <span>No export handy? Load a year of generated push/pull/legs training.</span>
          <Button variant="ghost" onClick={() => void loadSample()}>
            Try sample data
          </Button>
        </div>
      </Card>

      {state.step === 'working' && <p className="mb-6 text-sm text-ink-2">{state.message}</p>}
      {state.step === 'error' && (
        <Callout className="mb-6" tone="critical" title="Couldn't import this file">
          {state.message}
        </Callout>
      )}
      {state.step === 'done' && (
        <Callout className="mb-6" tone="good" title="Import complete">
          {importSummary(state.record)} <TextLink to="/">Go to dashboard</TextLink>
        </Callout>
      )}
      {state.step === 'mapping' && (
        <MappingStep
          key={state.fileHash}
          state={state}
          onChange={updateDraft}
          onApply={() => void applyMapping(state)}
          onCancel={reset}
        />
      )}
      {state.step === 'preview' && (
        <ImportPreview
          key={state.fileHash}
          state={state}
          onCommit={(options) => void commit(state, options)}
          onCancel={reset}
        />
      )}

      <ImportHistory />
    </>
  );
}
