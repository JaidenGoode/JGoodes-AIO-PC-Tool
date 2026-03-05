import { z } from 'zod';
import { tweaks, systemInfoSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  system: {
    info: {
      method: 'GET' as const,
      path: '/api/system/info' as const,
      responses: {
        200: systemInfoSchema,
      },
    },
  },
  tweaks: {
    list: {
      method: 'GET' as const,
      path: '/api/tweaks' as const,
      responses: {
        200: z.array(z.custom<typeof tweaks.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tweaks/:id' as const,
      input: z.object({ isActive: z.boolean() }),
      responses: {
        200: z.custom<typeof tweaks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type TweakUpdateInput = z.infer<typeof api.tweaks.update.input>;
