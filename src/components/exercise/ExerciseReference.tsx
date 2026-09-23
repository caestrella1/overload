import { db } from '../../db/db';
import { updateExercise } from '../../db/repo';
import { CATALOG } from '../../domain/catalog/match';
import { catalogReferenceFor } from '../../domain/catalog/lookup';
import type { Exercise } from '../../domain/types';
import { AcceptIcon, ReferenceIcon } from '../icons';
import { MuscleChips, MuscleSourceBadge } from '../MuscleChips';
import { Badge, Button, Callout, Card, DescriptionList, type DescriptionItem } from '../ui';

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Plain-language readings of the catalogue's own vocabulary. */
const FORCE: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  static: 'Static hold',
};

/**
 * What the bundled catalogue knows about this exercise, and — when its muscle groups are
 * still only a guess — that nothing has confirmed them yet.
 */
export function ExerciseReference({ exercise }: { exercise: Exercise }) {
  const reference = catalogReferenceFor(exercise);
  if (!reference) return null;
  const { entry, linked, agrees } = reference;
  const pending = exercise.muscleSource === 'suggested';

  const items: DescriptionItem[] = [
    { term: 'Matched entry', value: entry.name },
    { term: 'Primary', value: <MuscleChips muscles={{ primary: entry.primary, secondary: [] }} /> },
  ];
  if (entry.secondary.length) {
    items.push({
      term: 'Secondary',
      value: <MuscleChips muscles={{ primary: [], secondary: entry.secondary }} />,
    });
  }
  // The log's own equipment wins: the catalogue splits a movement into band, machine and
  // barbell variants, and the match lands on whichever variant's name was closest.
  const equipment = exercise.equipment ?? (entry.equipment ? titleCase(entry.equipment) : null);
  if (equipment) items.push({ term: 'Equipment', value: equipment });
  if (entry.mechanic) items.push({ term: 'Mechanic', value: titleCase(entry.mechanic) });
  if (entry.force)
    items.push({ term: 'Force', value: FORCE[entry.force] ?? titleCase(entry.force) });
  if (entry.category) items.push({ term: 'Type', value: titleCase(entry.category) });
  if (entry.level) items.push({ term: 'Level', value: titleCase(entry.level) });

  return (
    <Card
      icon={<ReferenceIcon />}
      title="Exercise reference"
      subtitle={`Matched by name against the bundled ${CATALOG.source} catalogue. Its entries split a movement by grip and equipment, so expect a variant; the muscle groups are what the match is for.`}
      actions={
        pending ? (
          <Badge tone="warning">Not accepted yet</Badge>
        ) : (
          <MuscleSourceBadge source={exercise.muscleSource} />
        )
      }
    >
      {pending && (
        <Callout tone="warning" title="These muscle groups are still a suggestion" className="mb-4">
          <p>
            Charts already count this exercise under them, but nothing has confirmed the match.
            {exercise.suggestionReason ? ` It was ${exercise.suggestionReason}.` : ''}
          </p>
          <Button
            variant="primary"
            className="mt-2"
            onClick={() => {
              void updateExercise(db, exercise.name, { muscleSource: 'user' });
            }}
          >
            <AcceptIcon />
            Accept these muscles
          </Button>
        </Callout>
      )}
      {!pending && !linked && (
        <Callout tone="info" title="Nothing links this exercise to the catalogue" className="mb-4">
          Its muscle groups came from elsewhere. This is only the closest name the catalogue has,
          shown for reference.
        </Callout>
      )}
      {!agrees && !pending && (
        <Callout tone="info" title="Your muscle groups differ from the catalogue" className="mb-4">
          Yours are what the charts use.
        </Callout>
      )}
      <DescriptionList items={items} />
    </Card>
  );
}
