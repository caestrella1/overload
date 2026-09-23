/**
 * Every icon the app uses, named for its job rather than its drawing. Iconoir is an MIT
 * stroke set (https://iconoir.com); keeping the choices here means a swap is one edit and
 * no component has to know which glyph it ended up with.
 *
 * Sizing and stroke come from the IconoirProvider in Layout, so icons scale with the text
 * they sit beside.
 */
export {
  Reports as DashboardIcon,
  Gym as ExercisesIcon,
  Yoga as MusclesIcon,
  GitCompare as CompareIcon,
  Settings as SettingsIcon,
  Upload as ImportIcon,
  Download as DownloadIcon,
  DatabaseRestore as RestoreIcon,
  Database as StorageIcon,
  Lock as PersistIcon,
  Table as FormatsIcon,
  Combine as AliasIcon,
  Copy as DuplicatesIcon,
  DatabaseBackup as BackupIcon,
  Trash as DeleteIcon,
  WeightAlt as BodyweightIcon,
  Search as SearchIcon,
  Check as AcceptIcon,
  Plus as AddIcon,
  Xmark as CloseIcon,
  NavArrowRight as CrumbIcon,
  NavArrowDown as MoreIcon,
  Undo as UndoIcon,
  EditPencil as EditIcon,
  BookmarkBook as ReferenceIcon,
  ClockRotateRight as HistoryIcon,
  Medal as PrIcon,
  GraphUp as TrendIcon,
  GraphDown as StalledIcon,
  Sparks as SuggestIcon,
  InfoCircle as InfoIcon,
  WarningTriangle as WarningIcon,
  CheckCircle as GoodIcon,
  XmarkCircle as CriticalIcon,
} from 'iconoir-react';
