import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    // Standard auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // WPU-specific
    prn: v.optional(v.string()),
    role: v.optional(v.string()), // "student" | "admin"
  })
    .index("email", ["email"])
    .index("prn", ["prn"]),

  items: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.string(),       // electronics, clothing, id-card, keys, books, other
    type: v.string(),           // "lost" | "found"
    location: v.string(),
    date: v.string(),
    imageId: v.optional(v.id("_storage")),
    reporterId: v.id("users"),

    // Moderation (optional for backwards-compatibility with existing items)
    approvalStatus: v.optional(v.string()), // "pending" | "approved" | "rejected"
    rejectionReason: v.optional(v.string()),

    // Matching & resolution
    status: v.string(),         // "active" | "resolved"
    matchedItemId: v.optional(v.id("items")),
    matchedAt: v.optional(v.number()),

    // Snapshot of reporter details at time of submission (for admin visibility)
    reporterName: v.optional(v.string()),
    reporterPrn: v.optional(v.string()),
    reporterEmail: v.optional(v.string()),
    reporterPhone: v.optional(v.string()),
  })
    .index("byStatus", ["approvalStatus"])
    .index("byReporter", ["reporterId"])
    .index("byType", ["type"])
    .index("byTypeAndStatus", ["type", "approvalStatus"]),

  // Admin email allowlist — admins can add other college emails here
  adminEmails: defineTable({
    email: v.string(),          // lowercase @mitwpu.edu.in email
    grantedBy: v.string(),      // PRN of the admin who granted access
    grantedAt: v.number(),
  }).index("byEmail", ["email"]),

  // Audit trail for admin actions
  auditLogs: defineTable({
    adminId: v.id("users"),
    action: v.string(),         // "approved" | "rejected" | "matched" | "granted_admin"
    targetId: v.optional(v.string()),
    note: v.optional(v.string()),
    timestamp: v.number(),
  }).index("byAdmin", ["adminId"]),
});
