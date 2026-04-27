export type DatabaseStatus = string;

export const DATABASE_DRAWER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Database", href: "/database" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Profile", href: "/profile" },
  { label: "Login", href: "/signin" },
] as const;

export const DATABASE_METRIC_YEARS = Array.from(
  { length: 10 },
  (_value, index) => new Date().getFullYear() - 1 - index,
);

export type DatabaseCategory = string;

export type DatabaseColumnDataType =
  | "text"
  | "numeric"
  | "integer"
  | "boolean"
  | "date"
  | "enum";

export type DatabaseColumnSource = string;

export type DatabaseCellValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>;

export type DatabaseColumnMeta = {
  field: string;
  headerName: string;
  dataType: DatabaseColumnDataType;
  source: DatabaseColumnSource;
  editable: boolean;
  hideable: boolean;
  addable: boolean;
  visible: boolean;
  width?: number;
  flex?: number;
  relation?: "country" | "applicants" | "commodity" | "metric-year";
};

export type DatabaseAdminMeta = {
  isAdmin: boolean;
  columnsByCategory: Record<DatabaseCategory, DatabaseColumnMeta[]>;
  hiddenColumnsByCategory: Record<DatabaseCategory, DatabaseColumnMeta[]>;
  canAddColumnsByCategory: Record<DatabaseCategory, boolean>;
  canHideColumnsByCategory: Record<DatabaseCategory, boolean>;
};

export type DatabaseCategoryMeta = {
  label: DatabaseCategory;
  source: string;
  canEditCells: boolean;
  canAddColumns: boolean;
  canHideColumns: boolean;
  sortOrder: number;
};

export type DatabaseRow = {
  id: number;
  [key: string]: DatabaseCellValue;
};

export type DatabaseFilterGroup = {
  title: string;
  field: string;
  options: { label: string; checked: boolean }[];
};

export type DatabaseDataSourceKind = "backend" | "placeholder";

export type DatabaseDataPayload = {
  categories: DatabaseCategoryMeta[];
  tablesByCategory: Record<DatabaseCategory, DatabaseRow[]>;
  filterGroupsByCategory: Record<DatabaseCategory, DatabaseFilterGroup[]>;
  admin: DatabaseAdminMeta;
  sourceKind: DatabaseDataSourceKind;
  sourceMessage?: string;
};

export type DatabaseDirtyCell = {
  category: DatabaseCategory;
  rowId: number;
  field: string;
  value: DatabaseCellValue;
  originalValue: DatabaseCellValue;
  metricRowId?: number;
};

export type DatabaseAddColumnInput = {
  category: DatabaseCategory;
  label: string;
  dataType: DatabaseColumnDataType;
  enumOptions?: string[];
};

export type DatabaseSaveFailure = {
  rowId: number;
  field: string;
  message: string;
};

export type DatabaseSaveResult = {
  saved: number;
  failed: DatabaseSaveFailure[];
};
