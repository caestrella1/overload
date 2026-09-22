import { METRIC_BY_ID, type MetricId } from '../domain/metrics';
import { Segmented } from './ui';

export function MetricPicker({
  value,
  metrics,
  onChange,
}: {
  value: MetricId;
  metrics: MetricId[];
  onChange: (m: MetricId) => void;
}) {
  return (
    <Segmented
      label="Metric"
      value={value}
      onChange={onChange}
      options={metrics.map((m) => ({ id: m, label: METRIC_BY_ID[m].label }))}
    />
  );
}
