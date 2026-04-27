import { proxyDatabaseAdminRequest } from "../admin-utils";

export async function POST(request: Request) {
  return proxyDatabaseAdminRequest(request, "/api/v1/database/admin/columns", "POST");
}
