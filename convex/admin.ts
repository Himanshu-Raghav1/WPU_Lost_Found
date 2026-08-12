import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { auth } from "./auth.js";
import { api, internal } from "./_generated/api";

// ─── Hardcoded initial admin PRN ─────────────────────────────────────────────
const INITIAL_ADMIN_PRN = "1262253515";
const INITIAL_ADMIN_EMAIL = "1262253515@mitwpu.edu.in";

// ─── Helper: check if a user is admin ─────────────────────────────────────────
export async function checkIsAdmin(ctx: any, userId: any) {
  if (!userId) return false;
  const user = await ctx.db.get(userId);
  if (!user) return false;

  const emailLower = (user.email || "").toLowerCase().trim();
  const prnTrimmed = (user.prn || "").trim();

  // Hardcoded initial admin checks (PRN 1262253515 or email 1262253515@mitwpu.edu.in)
  if (prnTrimmed === INITIAL_ADMIN_PRN || emailLower === INITIAL_ADMIN_EMAIL || emailLower.startsWith("1262253515@")) {
    return true;
  }
  if (user.role === "admin") return true;

  // Check adminEmails allowlist
  if (emailLower) {
    const entry = await ctx.db
      .query("adminEmails")
      .withIndex("byEmail", (q: any) => q.eq("email", emailLower))
      .unique();
    return entry !== null;
  }
  return false;
}

// ─── Query: is current user an admin ─────────────────────────────────────────
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    return checkIsAdmin(ctx, userId);
  },
});

// ─── Query: get all pending items (admin only) ─────────────────────────────────
export const getPendingItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");

    const items = await ctx.db
      .query("items")
      .withIndex("byStatus", (q) => q.eq("approvalStatus", "pending"))
      .order("desc")
      .collect();

    return Promise.all(
      items.map(async (item) => {
        let imageUrl = null;
        if (item.imageId) {
          try {
            imageUrl = await ctx.storage.getUrl(item.imageId);
          } catch {
            imageUrl = null;
          }
        }
        return {
          ...item,
          imageUrl,
          approvalStatus: item.approvalStatus || "pending",
          reporterName: item.reporterName || "Student",
          reporterPrn: item.reporterPrn || "---",
          reporterEmail: item.reporterEmail || "---",
        };
      })
    );
  },
});

// ─── Query: get ALL items with full details (admin only) ──────────────────────
export const getAllItemsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");

    const items = await ctx.db.query("items").order("desc").collect();

    return Promise.all(
      items.map(async (item) => {
        let imageUrl = null;
        if (item.imageId) {
          try {
            imageUrl = await ctx.storage.getUrl(item.imageId);
          } catch {
            imageUrl = null;
          }
        }
        return {
          ...item,
          imageUrl,
          approvalStatus: item.approvalStatus || "approved",
          reporterName: item.reporterName || "Student",
          reporterPrn: item.reporterPrn || "---",
          reporterEmail: item.reporterEmail || "---",
        };
      })
    );
  },
});

// ─── Mutation: approve item ───────────────────────────────────────────────────
export const approveItem = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");

    await ctx.db.patch(args.itemId, { approvalStatus: "approved" });

    // Audit log
    await ctx.db.insert("auditLogs", {
      adminId: userId!,
      action: "approved",
      targetId: args.itemId,
      timestamp: Date.now(),
    });
  },
});

// ─── Mutation: reject item ────────────────────────────────────────────────────
export const rejectItem = mutation({
  args: { itemId: v.id("items"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");

    await ctx.db.patch(args.itemId, {
      approvalStatus: "rejected",
      rejectionReason: args.reason ?? "Rejected by admin.",
    });

    await ctx.db.insert("auditLogs", {
      adminId: userId!,
      action: "rejected",
      targetId: args.itemId,
      note: args.reason,
      timestamp: Date.now(),
    });
  },
});

// ─── Query: get admin email allowlist ─────────────────────────────────────────
export const getAdminEmails = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");
    return ctx.db.query("adminEmails").collect();
  },
});

// ─── Mutation: add admin email ────────────────────────────────────────────────
export const addAdminEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");

    const emailLower = args.email.trim().toLowerCase();
    if (!emailLower.endsWith("@mitwpu.edu.in")) {
      throw new Error("Only @mitwpu.edu.in emails can be granted admin access.");
    }

    const existing = await ctx.db
      .query("adminEmails")
      .withIndex("byEmail", (q) => q.eq("email", emailLower))
      .unique();
    if (existing) throw new Error("Email already has admin access.");

    const admin = await ctx.db.get(userId!);
    await ctx.db.insert("adminEmails", {
      email: emailLower,
      grantedBy: admin?.prn ?? "unknown",
      grantedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      adminId: userId!,
      action: "granted_admin",
      targetId: emailLower,
      timestamp: Date.now(),
    });
  },
});

// ─── Mutation: remove admin email ─────────────────────────────────────────────
export const removeAdminEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");

    const emailLower = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("adminEmails")
      .withIndex("byEmail", (q) => q.eq("email", emailLower))
      .unique();
    if (!existing) throw new Error("Email not found in admin list.");
    await ctx.db.delete(existing._id);
  },
});

// ─── Query: smart match suggestions ──────────────────────────────────────────
// Compares every approved "lost" item against every approved "found" item
// using keyword overlap + category match + location proximity scoring.
export const getMatchSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");

    const allApproved = await ctx.db
      .query("items")
      .withIndex("byStatus", (q) => q.eq("approvalStatus", "approved"))
      .collect();

    const lostItems = allApproved.filter(
      (i) => i.type === "lost" && i.status === "active" && !i.matchedItemId
    );
    const foundItems = allApproved.filter(
      (i) => i.type === "found" && i.status === "active" && !i.matchedItemId
    );

    // Tokenize helper
    function tokenize(text: string): Set<string> {
      return new Set(
        text
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2)
      );
    }

    // Score a lost item vs a found item (0-100)
    function scoreMatch(lost: any, found: any): number {
      let score = 0;

      // Category match (30 pts)
      if (lost.category === found.category) score += 30;

      // Keyword overlap in title + description (50 pts max)
      const lostTokens = new Set([...tokenize(lost.title), ...tokenize(lost.description)]);
      const foundTokens = new Set([...tokenize(found.title), ...tokenize(found.description)]);
      const intersection = [...lostTokens].filter((t) => foundTokens.has(t));
      const union = new Set([...lostTokens, ...foundTokens]);
      const jaccard = union.size > 0 ? intersection.length / union.size : 0;
      score += Math.round(jaccard * 50);

      // Location similarity (20 pts)
      const lostLocTokens = tokenize(lost.location);
      const foundLocTokens = tokenize(found.location);
      const locIntersection = [...lostLocTokens].filter((t) => foundLocTokens.has(t));
      if (locIntersection.length > 0) score += 20;

      return Math.min(score, 100);
    }

    // Build pairs with score >= 20
    const suggestions: Array<{
      lostItem: any;
      foundItem: any;
      score: number;
    }> = [];

    for (const lost of lostItems) {
      for (const found of foundItems) {
        const score = scoreMatch(lost, found);
        if (score >= 20) {
          suggestions.push({ lostItem: lost, foundItem: found, score });
        }
      }
    }

    // Add image URLs
    const suggestionsWithImages = await Promise.all(
      suggestions.map(async (s) => ({
        ...s,
        foundItem: {
          ...s.foundItem,
          imageUrl: s.foundItem.imageId
            ? await ctx.storage.getUrl(s.foundItem.imageId)
            : null,
        },
        lostItem: {
          ...s.lostItem,
          imageUrl: s.lostItem.imageId
            ? await ctx.storage.getUrl(s.lostItem.imageId)
            : null,
        },
      }))
    );

    // Sort by score desc
    return suggestionsWithImages.sort((a, b) => b.score - a.score);
  },
});

// ─── Action: confirm match + send emails to both parties ──────────────────────
export const confirmMatch = action({
  args: {
    lostItemId: v.id("items"),
    foundItemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    // Fetch both items + reporter details via internal query
    const result = await ctx.runQuery(api.admin.getMatchDetails, {
      lostItemId: args.lostItemId,
      foundItemId: args.foundItemId,
    });

    const { lostItem, foundItem } = result;

    // Mark both as resolved and linked
    await ctx.runMutation(api.admin.setMatchResolved, {
      lostItemId: args.lostItemId,
      foundItemId: args.foundItemId,
    });

    // Send email to lost item reporter (the owner) — give them finder contact
    if (lostItem.reporterEmail) {
      await ctx.runAction(internal.email.sendEmail, {
        to: lostItem.reporterEmail,
        subject: `🎉 Your Lost Item "${lostItem.title}" Has Been Found! — MIT WPU L&F Portal`,
        htmlContent: buildMatchEmailForOwner(
          lostItem.reporterName ?? "Student",
          lostItem.title,
          foundItem.reporterName ?? "Student",
          foundItem.reporterEmail ?? "",
          foundItem.reporterPhone ?? "",
        ),
      });
    }

    // Send email to found item reporter (the finder) — give them owner contact
    if (foundItem.reporterEmail) {
      await ctx.runAction(internal.email.sendEmail, {
        to: foundItem.reporterEmail,
        subject: `✅ Owner Identified for "${foundItem.title}" — MIT WPU L&F Portal`,
        htmlContent: buildMatchEmailForFinder(
          foundItem.reporterName ?? "Student",
          foundItem.title,
          lostItem.reporterName ?? "Student",
          lostItem.reporterEmail ?? "",
          lostItem.reporterPhone ?? "",
        ),
      });
    }

    return { success: true };
  },
});

// ─── Query: get match details for confirmMatch action ─────────────────────────
export const getMatchDetails = query({
  args: {
    lostItemId: v.id("items"),
    foundItemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");
    const lostItem = await ctx.db.get(args.lostItemId);
    const foundItem = await ctx.db.get(args.foundItemId);
    if (!lostItem || !foundItem) throw new Error("Item not found");
    return { lostItem, foundItem };
  },
});

// ─── Mutation: mark items as resolved/matched ─────────────────────────────────
export const setMatchResolved = mutation({
  args: {
    lostItemId: v.id("items"),
    foundItemId: v.id("items"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!await checkIsAdmin(ctx, userId)) throw new Error("Unauthorized");

    const now = Date.now();
    await ctx.db.patch(args.lostItemId, {
      status: "resolved",
      matchedItemId: args.foundItemId,
      matchedAt: now,
    });
    await ctx.db.patch(args.foundItemId, {
      status: "resolved",
      matchedItemId: args.lostItemId,
      matchedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      adminId: userId!,
      action: "matched",
      targetId: `${args.lostItemId}←→${args.foundItemId}`,
      timestamp: now,
    });
  },
});

// ─── Email HTML builders (local helpers) ─────────────────────────────────────
function buildMatchEmailForOwner(
  ownerName: string,
  itemTitle: string,
  finderName: string,
  finderEmail: string,
  finderPhone: string,
) {
  return `<div style="font-family:-apple-system,sans-serif;padding:32px;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;color:#1d2b56;border:2px solid #1d2b56;">
  <h2 style="color:#16a34a;margin-bottom:4px;">🎉 Great News, ${ownerName}!</h2>
  <p style="color:#475569;font-size:15px;margin-bottom:20px;">
    Your lost item <strong>"${itemTitle}"</strong> has been found on MIT WPU campus! Admin has verified and confirmed the match.
  </p>
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="font-weight:700;color:#15803d;font-size:14px;margin-bottom:12px;">📞 Finder's Contact Details</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Name:</strong> ${finderName}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Email:</strong> <a href="mailto:${finderEmail}" style="color:#1d2b56;">${finderEmail}</a></p>
    <p style="margin:4px 0;font-size:14px;"><strong>Phone:</strong> ${finderPhone || "Not provided"}</p>
  </div>
  <p style="font-size:13px;color:#64748b;">Contact the finder directly to collect your item. — MIT WPU Lost &amp; Found Portal</p>
</div>`;
}

function buildMatchEmailForFinder(
  finderName: string,
  itemTitle: string,
  ownerName: string,
  ownerEmail: string,
  ownerPhone: string,
) {
  return `<div style="font-family:-apple-system,sans-serif;padding:32px;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;color:#1d2b56;border:2px solid #1d2b56;">
  <h2 style="color:#1d2b56;margin-bottom:4px;">✅ Owner Identified, ${finderName}!</h2>
  <p style="color:#475569;font-size:15px;margin-bottom:20px;">
    We've found the rightful owner of <strong>"${itemTitle}"</strong> that you reported! Thank you for your honesty.
  </p>
  <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="font-weight:700;color:#1d4ed8;font-size:14px;margin-bottom:12px;">📞 Owner's Contact Details</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Name:</strong> ${ownerName}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Email:</strong> <a href="mailto:${ownerEmail}" style="color:#1d2b56;">${ownerEmail}</a></p>
    <p style="margin:4px 0;font-size:14px;"><strong>Phone:</strong> ${ownerPhone || "Not provided"}</p>
  </div>
  <p style="font-size:13px;color:#64748b;">Please hand over the item to its rightful owner. Thank you! — MIT WPU Lost &amp; Found Portal</p>
</div>`;
}
