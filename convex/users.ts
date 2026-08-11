import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth, hashPassword } from "./auth.js";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

export const updatePrn = mutation({
  args: { prn: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return { success: false, reason: "Not authenticated" };
    const update: { prn: string; name?: string } = { prn: args.prn };
    if (args.name) update.name = args.name;
    await ctx.db.patch(userId, update);
    return { success: true };
  },
});

/**
 * Called immediately after OTP verification succeeds.
 * By the time this mutation runs the Convex client already holds the new JWT,
 * so auth.getUserId() returns a valid ID.
 * We fall back to an indexed email lookup just in case.
 */
export const setPasswordAndProfile = mutation({
  args: {
    email:    v.string(),
    prn:      v.string(),
    name:     v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailKey = args.email.trim().toLowerCase();

    // --- Primary: use the session token (available right after signIn resolves) ---
    let userId = await auth.getUserId(ctx);

    // --- Fallback: look up via indexed resend-otp account ---
    if (!userId) {
      const otpAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "resend-otp").eq("providerAccountId", emailKey)
        )
        .unique();

      if (!otpAccount) {
        throw new Error(
          "Email not verified. Please complete Steps 1 & 2 first."
        );
      }
      userId = otpAccount.userId;
    }

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User record not found.");

    // 1. Save Name & PRN on the user record
    await ctx.db.patch(userId, { name: args.name, prn: args.prn });

    // 2. Hash password with our SHA-256 helper
    const hashedPassword = await hashPassword(args.password);

    // 3. Upsert the password account so Password-provider sign-in works
    const existingPwAccount = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", emailKey)
      )
      .unique();

    if (existingPwAccount) {
      await ctx.db.patch(existingPwAccount._id, { secret: hashedPassword });
    } else {
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: emailKey,
        secret: hashedPassword,
      });
    }

    return { success: true };
  },
});

// Dev-only: wipe all users and accounts for a clean slate
export const resetDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const u of users) await ctx.db.delete(u._id);
    const accounts = await ctx.db.query("authAccounts").collect();
    for (const a of accounts) await ctx.db.delete(a._id);
    return { success: true };
  },
});
