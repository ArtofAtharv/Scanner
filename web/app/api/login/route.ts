import { NextRequest, NextResponse } from "next/server";

const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || "admin123";
const SCANNER_INVITE_CODE = process.env.SCANNER_INVITE_CODE || "scan123";

export async function POST(req: NextRequest) {
  try {
    const { inviteCode } = await req.json();

    let role = "";
    if (inviteCode === ADMIN_INVITE_CODE) {
      role = "admin";
    } else if (inviteCode === SCANNER_INVITE_CODE) {
      role = "scanner";
    }

    if (!role) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    // Set cookie
    const response = NextResponse.json({ role }, { status: 200 });
    response.cookies.set("auth_role", role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
