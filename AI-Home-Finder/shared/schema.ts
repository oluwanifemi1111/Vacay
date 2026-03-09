import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// OTP Verification
export const otpVerifications = pgTable("otp_verifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  attempts: integer("attempts").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Users
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull().default(""),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  role: text("role").notNull().default("renter"), // "renter" | "owner" | "admin"
  isVerified: boolean("is_verified").notNull().default(false),
  verificationStatus: text("verification_status").notNull().default("none"), // none | pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  apartments: many(apartments),
  savedApartments: many(savedApartments),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  rentRequests: many(rentRequests),
  wallet: one(wallets, { fields: [users.id], references: [users.ownerId] }),
  transactions: many(transactions),
  notifications: many(notifications),
}));

// Apartments
export const apartments = pgTable("apartments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("USD"), // USD, EUR, GBP, etc.
  location: text("location").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull().default(1),
  apartmentType: text("apartment_type").notNull(), // studio | 1bed | 2bed | duplex
  amenities: json("amenities").$type<string[]>().notNull().default([]),
  photos: json("photos").$type<string[]>().notNull().default([]),
  videos: json("videos").$type<string[]>().notNull().default([]),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("available"), // available | rented | pending
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apartmentsRelations = relations(apartments, ({ one, many }) => ({
  owner: one(users, { fields: [apartments.ownerId], references: [users.id] }),
  savedByUsers: many(savedApartments),
  rentRequests: many(rentRequests),
  transactions: many(transactions),
  messages: many(messages),
}));

// Saved apartments
export const savedApartments = pgTable("saved_apartments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  apartmentId: varchar("apartment_id")
    .notNull()
    .references(() => apartments.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const savedApartmentsRelations = relations(savedApartments, ({ one }) => ({
  user: one(users, { fields: [savedApartments.userId], references: [users.id] }),
  apartment: one(apartments, { fields: [savedApartments.apartmentId], references: [apartments.id] }),
}));

// AI chat messages (per user)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
}));

// User-to-user messages (in-app chat)
export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  apartmentId: varchar("apartment_id")
    .notNull()
    .references(() => apartments.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sender" }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id], relationName: "receiver" }),
  apartment: one(apartments, { fields: [messages.apartmentId], references: [apartments.id] }),
}));

// Rent requests
export const rentRequests = pgTable("rent_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  apartmentId: varchar("apartment_id")
    .notNull()
    .references(() => apartments.id, { onDelete: "cascade" }),
  moveInDate: timestamp("move_in_date").notNull(),
  rentDuration: integer("rent_duration").notNull(), // in months
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const rentRequestsRelations = relations(rentRequests, ({ one }) => ({
  user: one(users, { fields: [rentRequests.userId], references: [users.id] }),
  apartment: one(apartments, { fields: [rentRequests.apartmentId], references: [apartments.id] }),
}));

// Transactions (payments)
export const transactions = pgTable("transactions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  apartmentId: varchar("apartment_id")
    .notNull()
    .references(() => apartments.id, { onDelete: "cascade" }),
  totalAmount: integer("total_amount").notNull(),
  commissionAmount: integer("commission_amount").notNull(),
  ownerPayout: integer("owner_payout").notNull(),
  status: text("status").notNull().default("pending"), // pending | completed | failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  owner: one(users, { fields: [transactions.ownerId], references: [users.id] }),
  apartment: one(apartments, { fields: [transactions.apartmentId], references: [apartments.id] }),
}));

// Owner wallets
export const wallets = pgTable("wallets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletsRelations = relations(wallets, ({ one }) => ({
  owner: one(users, { fields: [wallets.ownerId], references: [users.id] }),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  readStatus: boolean("read_status").notNull().default(false),
  type: text("type").notNull(), // "message" | "request" | "payment" | "approval" | "verification"
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// Owner verification requests
export const verifications = pgTable("verifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  facePhotoUrl: text("face_photo_url").notNull(),
  idPhotoUrl: text("id_photo_url").notNull(),
  idType: text("id_type").notNull(), // "passport" | "license" | "national_id"
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
});

export const verificationsRelations = relations(verifications, ({ one }) => ({
  owner: one(users, { fields: [verifications.ownerId], references: [users.id] }),
  approver: one(users, { fields: [verifications.approvedBy], references: [users.id] }),
}));

// Terms and Conditions
export const termsAndConditions = pgTable("terms_and_conditions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  version: text("version").notNull().unique(), // e.g. "1.0", "1.1"
  content: text("content").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User acceptance of Terms and Conditions
export const userTermsAcceptance = pgTable("user_terms_acceptance", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  termsVersion: text("terms_version").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow(),
});

export const userTermsAcceptanceRelations = relations(userTermsAcceptance, ({ one }) => ({
  user: one(users, { fields: [userTermsAcceptance.userId], references: [users.id] }),
}));

// User Reports
export const userReports = pgTable("user_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reportedByUserId: varchar("reported_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: varchar("reported_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(), // e.g. "harassment", "fraud", "inappropriate content", "other"
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending | reviewed | resolved | dismissed
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
});

export const userReportsRelations = relations(userReports, ({ one }) => ({
  reporter: one(users, { fields: [userReports.reportedByUserId], references: [users.id], relationName: "reporter" }),
  reportedUser: one(users, { fields: [userReports.reportedUserId], references: [users.id], relationName: "reported" }),
  reviewer: one(users, { fields: [userReports.reviewedBy], references: [users.id] }),
}));

// Blocked Users
export const blockedUsers = pgTable("blocked_users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  blockingUserId: varchar("blocking_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  blockedUserId: varchar("blocked_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  blockingUser: one(users, { fields: [blockedUsers.blockingUserId], references: [users.id], relationName: "blocking" }),
  blockedUser: one(users, { fields: [blockedUsers.blockedUserId], references: [users.id], relationName: "blocked" }),
}));

// --- Zod schemas ---
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
  fullName: true,
  phone: true,
  password: true,
  role: true,
});

export const insertApartmentSchema = createInsertSchema(apartments).omit({
  id: true,
  createdAt: true,
});

export const insertSavedApartmentSchema = createInsertSchema(savedApartments).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
});

export const insertRentRequestSchema = createInsertSchema(rentRequests).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  submittedAt: true,
  approvedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertApartment = z.infer<typeof insertApartmentSchema>;
export type Apartment = typeof apartments.$inferSelect;
export type SavedApartment = typeof savedApartments.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type RentRequest = typeof rentRequests.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
