import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { CreateOrgSchema, type CreateOrgInput } from '@/lib/schemas'
import { useCreateOrganization } from '@/hooks/useCreateOrganization'

export function OrgForm() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const mutation = useCreateOrganization()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(CreateOrgSchema),
  })

  const selectedType = watch('type')

  // Clear school_district when type changes away from school
  useEffect(() => {
    if (selectedType !== 'school') {
      setValue('school_district', '')
    }
  }, [selectedType, setValue])

  function onSubmit(data: CreateOrgInput) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Organization created', description: `"${data.name}" has been created.` })
      },
      onError: (err) => {
        toast({ variant: 'destructive', title: 'Failed to create organization', description: err.message })
      },
    })
  }

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 max-w-lg">
      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="name">Organization Name</Label>
        <Input
          id="name"
          placeholder="Enter organization name"
          maxLength={100}
          {...register('name')}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Type */}
      <div className="space-y-1">
        <Label htmlFor="type">Organization Type</Label>
        <Select
          onValueChange={(val) =>
            setValue('type', val as CreateOrgInput['type'], { shouldValidate: true })
          }
        >
          <SelectTrigger id="type" aria-invalid={!!errors.type}>
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
        {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
      </div>

      {/* School district (conditional) */}
      {selectedType === 'school' && (
        <div className="space-y-1">
          <Label htmlFor="school_district">School District</Label>
          <Input
            id="school_district"
            placeholder="Enter school district"
            {...register('school_district')}
            aria-invalid={!!(errors as { school_district?: { message?: string } }).school_district}
          />
          {(errors as { school_district?: { message?: string } }).school_district && (
            <p className="text-sm text-destructive">
              {(errors as { school_district?: { message?: string } }).school_district?.message}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Organization
        </Button>
      </div>
    </form>
  )
}
