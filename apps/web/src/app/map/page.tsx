import type { Metadata } from "next";

import MapClient from "./map-client";

export const metadata: Metadata = {
  title: "Map",
  description: "Gold+ map view for Namibia MME mineral license polygons.",
};

export default function MapPage() {
  return <MapClient />;
}
