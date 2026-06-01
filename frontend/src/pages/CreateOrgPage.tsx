import { OrgForm } from '@/components/organizations/OrgForm'

export function CreateOrgPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Create Organization</h1>
      <OrgForm />
    </div>
  )
}
