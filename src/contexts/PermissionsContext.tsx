'use client'

import React, { createContext, useContext, useMemo } from 'react'
import { PermissionKey, ProfilePermissions, hasPermission } from '@/types/profiles'

interface PermissionsContextType {
  isOwner: boolean
  permissions: ProfilePermissions
  can: (key: PermissionKey | PermissionKey[]) => boolean
}

const PermissionsContext = createContext<PermissionsContextType>({
  isOwner: false,
  permissions: {} as ProfilePermissions,
  can: () => false,
})

export function PermissionsProvider({
  isOwner,
  permissions,
  children,
}: {
  isOwner: boolean
  permissions: ProfilePermissions
  children: React.ReactNode
}) {
  const value = useMemo(
    () => ({
      isOwner,
      permissions,
      can: (key: PermissionKey | PermissionKey[]) => hasPermission(isOwner, permissions, key),
    }),
    [isOwner, permissions]
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
