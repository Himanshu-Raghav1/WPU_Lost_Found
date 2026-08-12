import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth.js";
import { checkIsAdmin } from "./admin.js";

const MAX_REPORTS_PER_DAY = 2;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

// ─── Create Item with rate limiting, pre-moderation, reporter snapshot ────────
export const createItem = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    type: v.string(),
    location: v.string(),
    date: v.string(),
    phone: v.optional(v.string()),
    imageId: v.optional(v.id("_storage")),
    imageSizeBytes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User record not found");

    // ── 3MB file size check ───────────────────────────────────────────────
    if (args.imageSizeBytes && args.imageSizeBytes > MAX_IMAGE_BYTES) {
      throw new Error("Image file is too large. Maximum allowed size is 3 MB.");
    }

    // ── Rate limit: max 2 reports per email per 24 hours ──────────────────
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentItems = await ctx.db
      .query("items")
      .withIndex("byReporter", (q) => q.eq("reporterId", userId))
      .order("desc")
      .collect();

    const recentCount = recentItems.filter(
      (item) => item._creationTime > oneDayAgo
    ).length;

    if (recentCount >= MAX_REPORTS_PER_DAY) {
      throw new Error(
        "You have reached the daily limit of 2 reports. Please try again tomorrow."
      );
    }

    // ── Save phone on user profile if provided ────────────────────────────
    if (args.phone && !user.phone) {
      await ctx.db.patch(userId, { phone: args.phone });
    }

    const phoneToStore = args.phone || user.phone || "";

    // ── Insert item with pending status ───────────────────────────────────
    const itemId = await ctx.db.insert("items", {
      title: args.title,
      description: args.description,
      category: args.category,
      type: args.type,
      location: args.location,
      date: args.date,
      imageId: args.imageId,
      reporterId: userId,
      approvalStatus: "pending",
      status: "active",
      // Snapshot reporter details at submission time
      reporterName: user.name ?? "",
      reporterPrn: user.prn ?? "",
      reporterEmail: user.email ?? "",
      reporterPhone: phoneToStore,
    });

    // ── Notify admin via email (fire-and-forget) ──────────────────────────
    await ctx.scheduler.runAfter(0, internal.email.sendEmail, {
      to: "1262253515@mitwpu.edu.in",
      subject: `🔔 New ${args.type.toUpperCase()} Report Pending — ${args.title}`,
      htmlContent: buildAdminNotification(
        args.title,
        args.type,
        user.name ?? "Unknown",
        user.prn ?? "Unknown",
        args.category,
        args.location,
      ),
    });

    return itemId;
  },
});

// ─── Get all approved items for public feed (strips found images) ─────────────
export const getAllItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    const isAdminUser = await checkIsAdmin(ctx, userId);

    const allItems = await ctx.db
      .query("items")
      .order("desc")
      .collect();

    // Include items that are approved OR items that don't have approvalStatus set (legacy items)
    const items = allItems.filter(
      (item) => item.approvalStatus === "approved" || !item.approvalStatus
    );

    return Promise.all(
      items.map(async (item) => {
        // For found items: only admins see the actual photo
        const showImage = isAdminUser || item.type !== "found";
        let imageUrl = null;
        if (item.imageId && showImage) {
          try {
            imageUrl = await ctx.storage.getUrl(item.imageId);
          } catch {
            imageUrl = null;
          }
        }

        return {
          ...item,
          imageUrl,
          // Hide confidential reporter details from public
          reporterEmail: isAdminUser ? item.reporterEmail : undefined,
          reporterPhone: isAdminUser ? item.reporterPhone : undefined,
        };
      })
    );
  },
});

// ─── Resolve item (by reporter themselves) ────────────────────────────────────
export const resolveItem = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.reporterId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.itemId, { status: "resolved" });
  },
});

// ─── Admin notification email HTML ────────────────────────────────────────────
function buildAdminNotification(
  title: string,
  type: string,
  name: string,
  prn: string,
  category: string,
  location: string,
) {
  return `<div style="font-family:-apple-system,sans-serif;padding:32px;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;color:#1d2b56;border:2px solid #1d2b56;">
  <h2 style="color:#1d2b56;margin-bottom:4px;">🔔 New ${type.toUpperCase()} Item Report</h2>
  <p style="color:#475569;font-size:15px;margin-bottom:20px;">A new report is awaiting your approval in the Admin Panel.</p>
  <div style="background:#fefce8;border:1px solid #fde047;border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="margin:4px 0;font-size:14px;"><strong>Item:</strong> ${title}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Category:</strong> ${category}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Location:</strong> ${location}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Reporter:</strong> ${name} (PRN: ${prn})</p>
  </div>
  <a href="https://wpu-lost-found.netlify.app/admin" style="display:inline-block;background:#1d2b56;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Review in Admin Panel →</a>
</div>`;
}
