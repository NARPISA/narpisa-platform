export type DatabaseStatus = "Active" | "Inactive" | "Decommissioned";

export const DATABASE_DRAWER_LINKS = [
  { label: "Home", href: "/" },
  { label: "Database", href: "/database" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Profile", href: "/profile" },
  { label: "Login", href: "/login" },
] as const;

export const DATABASE_CATEGORY_TABS = [
  "Mines",
  "Commodity Metrics",
  "Water Metrics",
  "Licenses",
] as const;

export const DATABASE_METRIC_YEARS = Array.from(
  { length: 10 },
  (_value, index) => new Date().getFullYear() - 1 - index,
);

export type DatabaseCategory = (typeof DATABASE_CATEGORY_TABS)[number];

export type DatabaseRow = {
  id: number;
  [key: string]: string | number | boolean | null | undefined;
};

export type DatabaseFilterGroup = {
  title: string;
  field: string;
  options: { label: string; checked: boolean }[];
};

export type DatabaseDataSourceKind = "backend" | "placeholder";

export type DatabaseDataPayload = {
  tablesByCategory: Record<DatabaseCategory, DatabaseRow[]>;
  filterGroupsByCategory: Record<DatabaseCategory, DatabaseFilterGroup[]>;
  sourceKind: DatabaseDataSourceKind;
  sourceMessage?: string;
};
