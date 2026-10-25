import { z } from "zod";

/** A database id (cuid) arriving from the client: route params, form fields, action args. */
export const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);
