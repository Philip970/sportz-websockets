import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();
const MAX_LIMIT = 100;

/**
 * @openapi
 * /matches:
 *   get:
 *     summary: List matches
 *     tags:
 *       - Matches
 *     responses:
 *       200:
 *         description: Matches list returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query parameters.",
      details: parsed.error.issues,
    });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(desc(matches.createdAt))
      .limit(limit);
    res.json({ data });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to list matches.", details: error.message });
  }
});

/**
 * @openapi
 * /matches:
 *   post:
 *     summary: Create a match
 *     tags:
 *       - Matches
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sport
 *               - homeTeam
 *               - awayTeam
 *               - startTime
 *               - endTime
 *             properties:
 *               sport:
 *                 type: string
 *               homeTeam:
 *                 type: string
 *               awayTeam:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               homeScore:
 *                 type: integer
 *                 minimum: 0
 *               awayScore:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Match created
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Server error
 */
matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload.",
      details: parsed.error.issues,
    });
  }

  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();

    res.status(201).json({ data: event });
  } catch (e) {
    res.status(500).json({
      error: "Failed to create match.",
      details: e instanceof Error ? e.message : "Unknown error",
    });
  }
});
