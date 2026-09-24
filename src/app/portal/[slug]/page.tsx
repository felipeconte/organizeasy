import { notFound } from 'next/navigation'
import { getClientPortalOfficeDataAction } from '@/lib/actions/client-portal-auth'
import { getPortalDataAction } from '@/lib/actions/portal'
import ClientPortalCodeChallenge from '@/components/portal/ClientPortalCodeChallenge'
import ClientPortalOfficeView from '@/components/portal/ClientPortalOfficeView'
import PortalClient, { PortalData } from '@/components/portal/PortalClient'

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // 1. Verifica se o token pertence ao portal de um cliente específico de um escritório
  const officeRes = await getClientPortalOfficeDataAction(token)

  if (officeRes.success) {
    if (!officeRes.isUnlocked && officeRes.office) {
      return (
        <ClientPortalCodeChallenge
          portalToken={token}
          clientName={officeRes.clientName}
          office={officeRes.office}
        />
      )
    }

    if (officeRes.isUnlocked && officeRes.data) {
      return <ClientPortalOfficeView portalToken={token} data={officeRes.data} />
    }
  }

  // 2. Se não for portal de cliente, verifica se é um token direto de projeto (Magic Link direto)
  const projectRes = await getPortalDataAction(token)

  if (projectRes.data) {
    const portalData = projectRes.data as unknown as PortalData
    return <PortalClient token={token} data={portalData} />
  }

  // 3. Se nenhum token for válido
  notFound()
}
