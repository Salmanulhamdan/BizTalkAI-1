import { z } from "zod";
import { mysqlTable, varchar, text, timestamp, int, datetime, boolean } from "drizzle-orm/mysql-core";

// Chat Ainager table schema - matching actual database structure
export const chatAinagerTable = mysqlTable("chat_ainager", {
  ainagerId: varchar("ainager_id", { length: 255 }).primaryKey(),
  ainagerName: varchar("ainager_name", { length: 255 }).notNull(),
  ainagerDescription: text("ainager_description"),
  ainagerCreateDate: timestamp("ainager_create_date").notNull(),
  ainagerDeleteDate: timestamp("ainager_delete_date"),
  openaiKey: varchar("openai_key", { length: 255 }),
  ainagerType: varchar("ainager_type", { length: 10 }), // 'company' or 'hainager'
  ainagerInstruction: text("ainager_instruction"),
  ownerId: varchar("owner_id", { length: 255 }),
  isActive: varchar("is_active", { length: 1 }).notNull(),
  pdfFile: text("pdf_file"),
  corpmail: varchar("corpmail", { length: 254 }),
  microops: varchar("microops", { length: 500 }),
  parentAinager: varchar("parent_ainager", { length: 255 }),
  email: varchar("email", { length: 255 }),
});

// Zod schema for validation - matching actual database structure
export const ainagerSchema = z.object({
  ainagerId: z.string(),
  ainagerName: z.string(),
  ainagerDescription: z.string().optional(),
  ainagerCreateDate: z.date(),
  ainagerDeleteDate: z.date().optional(),
  openaiKey: z.string().optional(),
  ainagerType: z.string().optional(), // Can be 'company', 'hainager', or other values
  ainagerInstruction: z.string().optional(),
  ownerId: z.string().optional(),
  isActive: z.string(),
  pdfFile: z.string().optional(),
  corpmail: z.string().optional(),
  microops: z.string().optional(),
  parentAinager: z.string().optional(),
  email: z.string().optional(),
});

export type Ainager = z.infer<typeof ainagerSchema>;

// Static companies (fallback - will be replaced by database data)
export const companies = [
  "Al Ameen bakery",
  "Al Ameen Restaurant",
  "Al Ameen water",
  "Al Ameen clinic",
  "Al Ameen building materials",
  "Al Ameen printing press",
  "Al Ameen Hotel",
  "Al Ameen Bank",
  "Alpha Industries",
  "Alpha Foods",
  "Alpha Logistics",
  "Alpha Labs",
  "Alpha Digital",
  "Alpha Energy",
  "Alpha Systems",
  "Beta Solutions",
  "Beta Foods",
  "Beta Tech",
  "Beta Motors",
  "Beta Electronics",
  "Beta Health",
  "Beta Global",
  "Beta Network",
  "Beta Vision",
  "Beta Innovations",
  "Beta Logistics",
  "Beta Energy",
  "Beta Media",
  "Beta Travel",
  "Beta Finance",
  "Charlie Ventures",
  "Charlie Foods",
  "Charlie Digital",
  "Charlie Health",
  "Charlie Systems",
  "Charlie Labs",
  "Charlie Media",
  "Charlie Innovations",
  "Charlie Logistics",
  "Charlie Motors",
  "Charlie Travel",
  "Charlie Finance",
  "Charlie Electric",
  "Charlie Network",
  "Charlie Energy",
  "Delta Technologies",
  "Delta Foods",
  "Delta Health",
  "Delta Digital",
  "Delta Global",
  "Delta Media",
  "Delta Logistics",
  "Delta Energy",
  "Delta Motors",
  "Delta Innovations",
  "Delta Vision",
  "Delta Travel",
  "Delta Finance",
  "Delta Network",
  "Delta Labs",
  "Echo Innovations",
  "Echo Foods",
  "Echo Digital",
  "Echo Labs",
  "Echo Health",
  "Echo Global",
  "Echo Motors",
  "Echo Travel",
  "Echo Finance",
  "Echo Network",
  "Echo Systems",
  "Echo Vision",
  "Echo Energy",
  "Echo Media",
  "Echo Logistics"
];

export type Company = typeof companies[number];

// User schema and types
export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  createdAt: z.date().default(() => new Date()),
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Auth User table schema - matching actual database structure
export const authUserTable = mysqlTable("auth_user", {
  id: int("id").primaryKey().autoincrement(),
  password: varchar("password", { length: 128 }).notNull(),
  lastLogin: datetime("last_login", { mode: 'date' }),
  isSuperuser: boolean("is_superuser").notNull().default(false),
  username: varchar("username", { length: 150 }).notNull(),
  firstName: varchar("first_name", { length: 150 }).notNull(),
  lastName: varchar("last_name", { length: 150 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 15 }),
  isStaff: boolean("is_staff").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  dateJoined: datetime("date_joined", { mode: 'date' }).notNull(),
});

// Zod schema for auth user validation
export const authUserSchema = z.object({
  id: z.number().optional(),
  password: z.string(),
  lastLogin: z.date().optional(),
  isSuperuser: z.boolean().default(false),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  isStaff: z.boolean().default(false),
  isActive: z.boolean().default(true),
  dateJoined: z.date(),
});

export const insertAuthUserSchema = authUserSchema.omit({ id: true });
export const updateAuthUserSchema = authUserSchema.partial().omit({ id: true, dateJoined: true });

export type AuthUser = z.infer<typeof authUserSchema>;
export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;
export type UpdateAuthUser = z.infer<typeof updateAuthUserSchema>;
