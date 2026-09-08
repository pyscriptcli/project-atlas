import type { Response } from "express";
export const ok = <T>(res: Response, data: T, status = 200) => res.status(status).json({ data });
export const fail = (res: Response, status: number, code: string, message: string, details?: unknown) => res.status(status).json({ error: { code, message, ...(details === undefined ? {} : { details }) } });
