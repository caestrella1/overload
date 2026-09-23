import { exercisePath } from '../domain/units';
import { TextLink } from './ui';

export function ExerciseLink({ name, className }: { name: string; className?: string }) {
  return (
    <TextLink to={exercisePath(name)} subtle className={className}>
      {name}
    </TextLink>
  );
}
