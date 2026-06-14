import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string | null;
      organization: string;
      active: boolean;
      viewerCanExport: boolean;
    } & DefaultSession["user"];
  }
}
