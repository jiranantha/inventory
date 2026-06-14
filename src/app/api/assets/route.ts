import { NextRequest, NextResponse } from "next/server";
import { hasPermission, type ApiUser, type PermissionAction, type UserRole } from "@/lib/permissions";

const roles: UserRole[] = ["Admin", "Staff", "Club Officer", "Viewer"];

function readApiUser(request: NextRequest): ApiUser | null {
  const role = request.headers.get("x-user-role") as UserRole | null;
  if (!role || !roles.includes(role)) return null;

  return {
    role,
    organization: request.headers.get("x-user-organization") ?? undefined,
    viewerCanExport: request.headers.get("x-viewer-can-export") === "true",
  };
}

function forbidden() {
  return NextResponse.json({ message: "ไม่มีสิทธิ์ใช้งาน API นี้" }, { status: 403 });
}

type PermissionCheck =
  | { allowed: true; user: ApiUser }
  | { allowed: false; response: NextResponse };

function requirePermission(request: NextRequest, action: PermissionAction): PermissionCheck {
  const user = readApiUser(request);
  if (!user) {
    return {
      allowed: false,
      response: NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 }),
    };
  }

  const assetOrganization = request.headers.get("x-asset-organization") ?? undefined;
  if (!hasPermission(user, action, { organization: assetOrganization })) {
    return { allowed: false, response: forbidden() };
  }

  return { allowed: true, user };
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") === "export" ? "export" : "view";
  const result = requirePermission(request, action);
  if (!result.allowed) return result.response;

  return NextResponse.json({
    message: "ผ่านการตรวจสิทธิ์ API",
    action,
    role: result.user.role,
  });
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") === "inspect" ? "inspect" : "create";
  const result = requirePermission(request, action);
  if (!result.allowed) return result.response;

  return NextResponse.json({ message: "บันทึกข้อมูลผ่าน API ได้", action, role: result.user.role });
}

export async function PATCH(request: NextRequest) {
  const result = requirePermission(request, "edit");
  if (!result.allowed) return result.response;

  return NextResponse.json({ message: "แก้ไขข้อมูลผ่าน API ได้", role: result.user.role });
}

export async function DELETE(request: NextRequest) {
  const result = requirePermission(request, "delete");
  if (!result.allowed) return result.response;

  return NextResponse.json({ message: "ลบข้อมูลผ่าน API ได้", role: result.user.role });
}
