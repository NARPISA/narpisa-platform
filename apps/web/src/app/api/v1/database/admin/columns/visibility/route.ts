import { proxyDatabaseAdminRequest } from "../../admin-utils";

export async function PATCH(request: Request) {
  return proxyDatabaseAdminRequest(
    request,
    "/api/v1/database/admin/columns/visibility",
    "PATCH",
  );
}
