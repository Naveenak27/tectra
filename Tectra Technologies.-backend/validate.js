const { z } = require('zod');

const doctorCreateSchema = z.object({
  name: z.string().min(2),
  specialty: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  is_active: z.boolean().optional()
});

const doctorUpdateSchema = doctorCreateSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().optional(),
  specialty: z.string().trim().optional(),
  sortBy: z.enum(['name','specialty','created_at','updated_at']).optional(),
  sortDir: z.enum(['asc','desc']).optional()
});

module.exports = { doctorCreateSchema, doctorUpdateSchema, listQuerySchema };
