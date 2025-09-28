'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getAllUserRoles } from '@/services/contracts/roleManagement';

/**
 * Role-based content wrapper component
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of allowed roles
 * @param {React.ReactNode} props.children - Content to render if role matches
 * @param {React.ReactNode} props.fallback - Content to render if role doesn't match
 * @returns {JSX.Element}
 */
export default function RoleBasedContent({ 
  allowedRoles = [], 
  children, 
  fallback = null 
}) {
  const { address, signer } = useWallet();
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUserRoles() {
      if (!address || !signer) {
        setUserRoles([]);
        setLoading(false);
        return;
      }

      try {
        const roles = await getAllUserRoles(signer, address);
        
        // Convert roles object to array format for compatibility
        const userRolesList = [];
        if (roles.registry.ADMIN_ROLE || roles.stock.ADMIN_ROLE) {
          userRolesList.push('ADMIN_ROLE');
        }
        if (roles.registry.MEDICAL_AGENT_ROLE) {
          userRolesList.push('MEDICAL_AGENT_ROLE');
        }
        if (roles.stock.LOGISTIC_MANAGER_ROLE) {
          userRolesList.push('LOGISTIC_MANAGER_ROLE');
        }
        
        setUserRoles(userRolesList);
      } catch (error) {
        console.error('Error checking user roles:', error);
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    }

    checkUserRoles();
  }, [address, signer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const hasPermission = allowedRoles.length === 0 || 
    allowedRoles.some(role => userRoles.includes(role));

  if (!hasPermission) {
    return fallback || (
      <div className="p-4 bg-gray-100 rounded-lg text-center">
        <p className="text-gray-600">
          Vous n'avez pas les permissions nécessaires pour accéder à cette section.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}