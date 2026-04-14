import type { Metadata } from "next";

import DatabaseClient from "./database-client";

export const metadata: Metadata = {
  title: "Database",
  description: "NaRPISA database interface",
};

export default function DatabasePage() {
  return <DatabaseClient />;
}
