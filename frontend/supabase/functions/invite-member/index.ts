import { z } from 'https://esm.sh/zod@3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const InviteMemberSchema = z.object({
  organization_id: z.string().uuid(),
  email: z.string().email().max(254),
})

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Extract and verify JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse and validate body
    const body = await req.json()
    const parsed = InviteMemberSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(JSON.stringify({ errors: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { organization_id, email } = parsed.data

    // Check org exists
    const { data: org } = await supabase
      .from('organizations')
      .select('id, created_by')
      .eq('id', organization_id)
      .maybeSingle()
    if (!org) {
      return new Response(JSON.stringify({ error: 'Organization not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check ownership
    if (org.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: you do not own this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check for duplicate invite
    const { data: existing } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('email', email)
      .maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({ error: 'This email has already been invited to this organization' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insert member
    const { data: member, error: insertError } = await supabase
      .from('organization_members')
      .insert({
        organization_id,
        email,
        status: 'invited',
        role: 'member',
        joined_at: null,
      })
      .select()
      .single()
    if (insertError) throw insertError

    return new Response(JSON.stringify(member), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
