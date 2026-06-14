import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens, type UserRow } from "@/db/schema";

// Emails auto-promoted to active Admin on first sign-in. Without this, the very
// first account (and every account thereafter) would be inactive with nobody
// able to approve it.
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  // Allow self-hosting behind any host (Auth.js otherwise locks to Vercel host).
  trustHost: true,
  providers: [
    Google({
      // Google verifies email ownership, so it is safe to link a Google sign-in
      // to a user row that an Admin pre-created with the same email.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  events: {
    // Fires once, right after a brand-new user row is created by the adapter.
    async createUser({ user }) {
      if (user.id && user.email && adminEmails.includes(user.email.toLowerCase())) {
        await db
          .update(users)
          .set({ role: "Admin", active: true, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
    },
  },
  callbacks: {
    // Database session strategy: `user` is the full DB row, so the app's
    // authorization fields are available to attach to the session.
    async session({ session, user }) {
      const dbUser = user as UserRow;
      if (session.user) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role ?? null;
        session.user.organization = dbUser.organization ?? "-";
        session.user.active = dbUser.active ?? false;
        session.user.viewerCanExport = dbUser.viewerCanExport ?? false;
      }
      return session;
    },
  },
});
