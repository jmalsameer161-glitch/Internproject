import { z } from 'zod'

export const SignUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const SignInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const CreateOrgSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
    type: z.literal('school'),
    school_district: z.string().min(1, 'School district is required for school organizations'),
  }),
  z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
    type: z.enum(['nonprofit', 'business', 'government', 'startup']),
    school_district: z.string().optional(),
  }),
])

export const InviteMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email must be 254 characters or fewer'),
})

export type SignUpInput = z.infer<typeof SignUpSchema>
export type SignInInput = z.infer<typeof SignInSchema>
export type CreateOrgInput = z.infer<typeof CreateOrgSchema>
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>
