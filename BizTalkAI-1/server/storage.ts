import { type User, type InsertUser, type Ainager, chatAinagerTable } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, inArray, desc } from "drizzle-orm";

// Database connection
const connectionConfig = {
  host: process.env.DB_HOST || 'billsphere.com',
  user: process.env.DB_USER || 'dulto726fxeg',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'csvfiles',
  port: parseInt(process.env.DB_PORT || '3306'),
};

// Database connection configuration loaded

// Create connection pool instead of single connection
const connectionPool = mysql.createPool(connectionConfig);
export const db = drizzle(connectionPool);

// Test database connection
connectionPool.getConnection().then(conn => {
  console.log('✅ Database connected');
  return conn.ping();
}).then(() => {
  console.log('✅ Database ready');
}).catch(error => {
  console.error('❌ Database connection failed:', error.message);
});

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAinagers(page?: number, limit?: number, search?: string): Promise<{ ainagers: Ainager[], hasMore: boolean, total: number }>;
  getAinagerById(id: string): Promise<Ainager | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async getAinagers(page: number = 1, limit: number = 10, search: string = ""): Promise<{ ainagers: Ainager[], hasMore: boolean, total: number }> {
    try {
      const offset = (page - 1) * limit;
      const { like, and, or } = await import('drizzle-orm');
      
      // Build where conditions
      let whereConditions: any = inArray(chatAinagerTable.ainagerType, ["company", "hainager", "Hainager"]);
      
      // Add search condition if search term exists
      if (search.trim()) {
        whereConditions = and(
          whereConditions,
          like(chatAinagerTable.ainagerName, `%${search.trim()}%`)
        );
      }
      
      // Get total count for pagination
      const countResult = await db
        .select({ count: chatAinagerTable.ainagerId })
        .from(chatAinagerTable)
        .where(whereConditions);
      
      const total = countResult.length;
      
      // Get paginated results
      const result = await db
        .select()
        .from(chatAinagerTable)
        .where(whereConditions)
        .orderBy(desc(chatAinagerTable.ainagerCreateDate))
        .limit(limit)
        .offset(offset);
      
      const ainagers = result.map(row => ({
        ainagerId: row.ainagerId,
        ainagerName: row.ainagerName,
        ainagerDescription: row.ainagerDescription ?? undefined,
        ainagerCreateDate: row.ainagerCreateDate,
        ainagerDeleteDate: row.ainagerDeleteDate ?? undefined,
        openaiKey: row.openaiKey ?? undefined,
        ainagerType: row.ainagerType ?? undefined,
        ainagerInstruction: row.ainagerInstruction ?? undefined,
        ownerId: row.ownerId ?? undefined,
        isActive: row.isActive,
        pdfFile: row.pdfFile ?? undefined,
        corpmail: row.corpmail ?? undefined,
        microops: row.microops ?? undefined,
        parentAinager: row.parentAinager ?? undefined,
        email: row.email ?? undefined,
      }));
      
      const hasMore = offset + result.length < total;

      return {
        ainagers,
        hasMore,
        total
      };

    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching ainagers:", error.message);
      } else {
        console.error("Error fetching ainagers:", error);
      }
      return { ainagers: [], hasMore: false, total: 0 };
    }
  }

  async getAinagerById(id: string): Promise<Ainager | undefined> {
    try {
      const result = await db
        .select()
        .from(chatAinagerTable)
        .where(eq(chatAinagerTable.ainagerId, id))
        .limit(1);
      
      if (result.length === 0) {
        return undefined;
      }
      
      const row = result[0];
      return {
        ainagerId: row.ainagerId ?? undefined,
        ainagerName: row.ainagerName ?? undefined,
        ainagerDescription: row.ainagerDescription ?? undefined,
        ainagerCreateDate: row.ainagerCreateDate ?? undefined,
        ainagerDeleteDate: row.ainagerDeleteDate ?? undefined,
        openaiKey: row.openaiKey ?? undefined,
        ainagerType: row.ainagerType ?? undefined,
        ainagerInstruction: row.ainagerInstruction ?? undefined,
        ownerId: row.ownerId ?? undefined,
        isActive: row.isActive ?? undefined,
        pdfFile: row.pdfFile ?? undefined,
        corpmail: row.corpmail ?? undefined,
        microops: row.microops ?? undefined,
        parentAinager: row.parentAinager ?? undefined,
        email: row.email ?? undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching ainager by ID:", error.message);
      } else {
        console.error("Error fetching ainager by ID:", error);
      }
      return undefined;
    }
  }
}

export const storage = new MemStorage();
