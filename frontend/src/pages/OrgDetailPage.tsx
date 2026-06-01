import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, Loader2, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { OrgTypeBadge } from '@/components/organizations/OrgTypeBadge'
import { MemberList } from '@/components/members/MemberList'
import { InviteForm } from '@/components/members/InviteForm'
import { useOrganization } from '@/hooks/useOrganization'
import { useUpdateOrganization } from '@/hooks/useUpdateOrganization'
import { useToast } from '@/components/ui/use-toast'
import { formatDate } from '@/lib/utils'
import type { OrgType } from '@/types'

// Edit form schema
const EditOrgSchema = z.discriminatedUnion('type', [
  z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
    type: z.literal('school'),
    school_district: z.string().min(1, 'School district is required'),
  }),
  z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
    type: z.enum(['nonprofit', 'business', 'government', 'startup']),
    school_district: z.string().optional(),
  }),
])

type EditOrgInput = z.infer<typeof EditOrgSchema>

export function OrgDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: org, isLoading, isError, refetch } = useOrganization(id)
  const updateMutation = useUpdateOrganization()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EditOrgInput>({
    resolver: zodResolver(EditOrgSchema),
  })

  const selectedType = watch('type')

  // Populate form when org loads or edit mode opens
  useEffect(() => {
    if (org && isEditing) {
      reset({
        name: org.name,
        type: org.type as EditOrgInput['type'],
        school_district: org.school_district ?? '',
      })
    }
  }, [org, isEditing, reset])

  // Clear school_district when type changes away from school
  useEffect(() => {
    if (selectedType !== 'school') {
      setValue('school_district', '')
    }
  }, [selectedType, setValue])

  function onSubmit(data: EditOrgInput) {
    if (!org) return
    updateMutation.mutate(
      {
        id: org.id,
        name: data.name,
        type: data.type as OrgType,
        school_district: data.type === 'school' ? data.school_district : null,
      },
      {
        onSuccess: () => {
          toast({ title: 'Organization updated', description: `"${data.name}" has been saved.` })
          setIsEditing(false)
        },
        onError: (err) => {
          toast({ variant: 'destructive', title: 'Update failed', description: err.message })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm">Failed to load organization.</span>
        <Button variant="outline" size="sm" onClick={() => void refetch()} className="ml-auto">
          Retry
        </Button>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">Access denied</p>
          <p className="text-sm text-muted-foreground">
            This organization does not exist or you do not have access to it.
          </p>
        </div>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Organizations
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Organizations
      </Link>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
        <OrgTypeBadge type={org.type} />
      </div>

      {/* Org meta card */}
      <Card>
        <CardContent className="p-6">
          {/* Card header row */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-foreground">Organization Details</p>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="gap-1.5 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
          </div>

          {/* View mode */}
          {!isEditing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Name</p>
                <p className="font-medium text-foreground">{org.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Type</p>
                <OrgTypeBadge type={org.type} />
              </div>
              {org.type === 'school' && org.school_district && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">School District</p>
                  <p className="font-medium text-foreground">{org.school_district}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Created</p>
                <p className="font-medium text-foreground">{formatDate(org.created_at)}</p>
              </div>
            </div>
          )}

          {/* Edit mode */}
          {isEditing && (
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  maxLength={100}
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-1">
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  defaultValue={org.type}
                  onValueChange={(val) =>
                    setValue('type', val as EditOrgInput['type'], { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="nonprofit">Nonprofit</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type.message}</p>
                )}
              </div>

              {/* School district (conditional) */}
              {selectedType === 'school' && (
                <div className="space-y-1">
                  <Label htmlFor="edit-school-district">School District</Label>
                  <Input
                    id="edit-school-district"
                    {...register('school_district')}
                    aria-invalid={
                      !!(errors as { school_district?: { message?: string } }).school_district
                    }
                  />
                  {(errors as { school_district?: { message?: string } }).school_district && (
                    <p className="text-sm text-destructive">
                      {(errors as { school_district?: { message?: string } }).school_district?.message}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Members section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Members</h2>
        <MemberList orgId={org.id} />
      </div>

      <Separator />

      {/* Invite section */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Invite Member</h2>
        <InviteForm orgId={org.id} />
      </div>
    </div>
  )
}
