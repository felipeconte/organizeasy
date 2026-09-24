import { notFound, redirect } from 'next/navigation'
import {
  getOfficePortalDataAction,
  getClientPortalOfficeDataAction,
  getProjectPortalChallengeInfoAction,
} from '@/lib/actions/client-portal-auth'
import { getPortalDataAction } from '@/lib/actions/portal'
import ClientPortalCodeChallenge from '@/components/portal/ClientPortalCodeChallenge'
import ClientPortalOfficeView from '@/components/portal/ClientPortalOfficeView'
import ProjectPortalCodeChallenge from '@/components/portal/ProjectPortalCodeChallenge'
import PortalClient, { PortalData } from '@/components/portal/PortalClient'
import OfficePortalLogin from '@/components/portal/OfficePortalLogin'

export default async function CustomerPortalSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ redirect?: string }>
}) {
  const { slug } = await params
  const { redirect: redirectUrl } = await searchParams

  // 1. Verifica se o slug pertence a um escritório do Organizeasy
  const officeRes = await getOfficePortalDataAction(slug)

  if (officeRes.success && officeRes.office) {
    // Se o cliente já estiver autenticado neste escritório
    if (officeRes.isAuthenticated && officeRes.data) {
      if (redirectUrl) {
        redirect(redirectUrl)
      }
      return (
        <ClientPortalOfficeView
          orgSlug={slug}
          data={officeRes.data}
          sessionExpiresAt={officeRes.sessionExpiresAt}
        />
      )
    }

    // Se não estiver autenticado, exibe tela de login do escritório
    return <OfficePortalLogin office={officeRes.office} redirectUrl={redirectUrl} />
  }

  // 2. Fallback para tokens legados de clientes
  const legacyClientRes = await getClientPortalOfficeDataAction(slug)
  if (legacyClientRes.success) {
    if (!legacyClientRes.isUnlocked && legacyClientRes.office) {
      return (
        <ClientPortalCodeChallenge
          portalToken={slug}
          clientName={legacyClientRes.clientName}
          office={legacyClientRes.office}
        />
      )
    }

    if (legacyClientRes.isUnlocked && legacyClientRes.data) {
      return (
        <ClientPortalOfficeView
          portalToken={slug}
          data={legacyClientRes.data}
          sessionExpiresAt={legacyClientRes.sessionExpiresAt}
        />
      )
    }
  }

  // 3. Fallback para tokens legados de projetos
  const projectChallenge = await getProjectPortalChallengeInfoAction(slug)
  if (projectChallenge.success) {
    if (!projectChallenge.isUnlocked && projectChallenge.project && projectChallenge.office) {
      return (
        <ProjectPortalCodeChallenge
          projectToken={slug}
          project={projectChallenge.project}
          office={projectChallenge.office}
        />
      )
    }

    if (projectChallenge.isUnlocked) {
      const projectRes = await getPortalDataAction(slug)
      if (projectRes.data) {
        const portalData = projectRes.data as unknown as PortalData
        return (
          <PortalClient
            token={slug}
            data={portalData}
            activeClientId={projectChallenge.clientId}
            activeClientName={projectChallenge.clientName}
          />
        )
      }
    }
  }

  // 4. Se não encontrar nada
  notFound()
}
