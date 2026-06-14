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
  // JWT sessions: the authorization fields ride in the encrypted session cookie,
  // so the hot path (every `useSession()` / `/api/auth/session` call) never
  // touches the database. The database-strategy version did a per-request read +
  // rolling-session UPDATE on Supabase's pooler, which intermittently hung the
  // serverless function up to its 300s limit. The adapter is still used to
  // persist users/accounts at sign-in.
  session: { strategy: "jwt" },
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
    // Runs at sign-in (when `user` is set) and on every later session check.
    // We hit the DB ONLY at sign-in to snapshot the authorization fields onto the
    // token — re-reading the fresh row so the `createUser` admin-promotion below
    // is reflected — then serve every subsequent request from the token alone.
    async jwt({ token, user }) {
      if (user?.id) {
        const [fresh] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        const dbUser = (fresh ?? user) as UserRow;
        token.id = dbUser.id;
        token.role = dbUser.role ?? null;
        token.organization = dbUser.organization ?? "-";
        token.active = dbUser.active ?? false;
        token.viewerCanExport = dbUser.viewerCanExport ?? false;
      }
      return token;
    },
    // Project the token's authorization fields onto the session. No DB access —
    // this is what keeps /api/auth/session from hanging on the pooler.
    // NOTE: role/active/organization changes an Admin makes only take effect after
    // the affected user signs out and back in (the token is refreshed at sign-in).
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as string | null) ?? null;
        session.user.organization = (token.organization as string) ?? "-";
        session.user.active = Boolean(token.active);
        session.user.viewerCanExport = Boolean(token.viewerCanExport);
      }
      return session;
    },
  },
});
