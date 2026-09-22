import type { ReactNode } from 'react';
import { EmptyState, PageHeader, TextLink } from './ui';

/** Page shown before anything has been imported, pointing at the import screen. */
export function NoDataPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState title="No workouts yet">
        <TextLink to="/import">Import a Strong CSV export</TextLink> {children}
      </EmptyState>
    </>
  );
}
