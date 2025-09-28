'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, UserPlus, UserMinus, AlertCircle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { 
  getVaccineStockContract, 
  getVaccineRegistryContract,
  grantRole,
  revokeRole,
  hasRole,
  getRoles
} from '@/services/contracts/roleManagement';
import toast from 'react-hot-toast';

/**
 * Role management component for blockchain contracts
 * @returns {JSX.Element}
 */
export default function RoleManagement() {
  const { signer, address, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState({});
  const [roleForm, setRoleForm] = useState({
    userAddress: '',
    selectedRole: 'MEDICAL_AGENT_ROLE',
    contract: 'registry'
  });

  // Available roles for each contract
  const availableRoles = {
    registry: [
      { key: 'ADMIN_ROLE', name: 'Administrator', description: 'Full system access and role management' },
      { key: 'MEDICAL_AGENT_ROLE', name: 'Medical Agent', description: 'Patient registration and dose administration' }
    ],
    stock: [
      { key: 'ADMIN_ROLE', name: 'Administrator', description: 'Full system access and role management' },
      { key: 'LOGISTIC_MANAGER_ROLE', name: 'Logistic Manager', description: 'Stock management and center operations' }
    ]
  };

  /**
   * Load user roles from contracts
   */
  const loadUserRoles = async () => {
    if (!signer || !address) return;

    setLoading(true);
    try {
      const registryContract = getVaccineRegistryContract(signer);
      const stockContract = getVaccineStockContract(signer);

      const roles = {};

      // Check registry roles
      for (const role of availableRoles.registry) {
        const hasRoleResult = await hasRole(registryContract, role.key, address);
        if (!roles.registry) roles.registry = {};
        roles.registry[role.key] = hasRoleResult;
      }

      // Check stock roles
      for (const role of availableRoles.stock) {
        const hasRoleResult = await hasRole(stockContract, role.key, address);
        if (!roles.stock) roles.stock = {};
        roles.stock[role.key] = hasRoleResult;
      }

      setUserRoles(roles);
    } catch (error) {
      console.error('Error loading user roles:', error);
      toast.error('Failed to load user roles');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Grant role to user
   */
  const handleGrantRole = async () => {
    if (!signer || !roleForm.userAddress || !roleForm.selectedRole) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const contract = roleForm.contract === 'registry' 
        ? getVaccineRegistryContract(signer)
        : getVaccineStockContract(signer);

      await grantRole(contract, roleForm.selectedRole, roleForm.userAddress);
      
      toast.success(`Role ${roleForm.selectedRole} granted successfully`);
      setRoleForm({
        userAddress: '',
        selectedRole: 'MEDICAL_AGENT_ROLE',
        contract: 'registry'
      });
      
      // Refresh roles if it's the current user
      if (roleForm.userAddress.toLowerCase() === address.toLowerCase()) {
        await loadUserRoles();
      }
    } catch (error) {
      console.error('Error granting role:', error);
      toast.error('Failed to grant role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Revoke role from user
   */
  const handleRevokeRole = async (contract, roleKey, userAddress) => {
    if (!signer) return;

    setLoading(true);
    try {
      const contractInstance = contract === 'registry' 
        ? getVaccineRegistryContract(signer)
        : getVaccineStockContract(signer);

      await revokeRole(contractInstance, roleKey, userAddress);
      
      toast.success(`Role ${roleKey} revoked successfully`);
      
      // Refresh roles if it's the current user
      if (userAddress.toLowerCase() === address.toLowerCase()) {
        await loadUserRoles();
      }
    } catch (error) {
      console.error('Error revoking role:', error);
      toast.error('Failed to revoke role: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user is admin for any contract
   */
  const isAdmin = () => {
    return userRoles.registry?.ADMIN_ROLE || userRoles.stock?.ADMIN_ROLE;
  };

  // Load roles on component mount
  useEffect(() => {
    if (!isConnected || !signer || !address) {
      // Reset roles when disconnected
      setUserRoles({});
      setRoleForm({
        userAddress: '',
        selectedRole: 'MEDICAL_AGENT_ROLE',
        contract: 'registry'
      });
      return;
    }
    
    // Load roles when connected
    if (isConnected && signer && address) {
      loadUserRoles();
    }
  }, [isConnected, signer, address]);

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          Please connect your wallet to manage roles
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current User Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Your Current Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-4">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <p className="mt-2 text-gray-600">Loading roles...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Registry Contract</h4>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.registry.map((role) => (
                    <Badge
                      key={role.key}
                      variant={userRoles.registry?.[role.key] ? "default" : "secondary"}
                      className={userRoles.registry?.[role.key] ? "bg-green-100 text-green-800" : ""}
                    >
                      {userRoles.registry?.[role.key] ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Stock Contract</h4>
                <div className="flex flex-wrap gap-2">
                  {availableRoles.stock.map((role) => (
                    <Badge
                      key={role.key}
                      variant={userRoles.stock?.[role.key] ? "default" : "secondary"}
                      className={userRoles.stock?.[role.key] ? "bg-green-100 text-green-800" : ""}
                    >
                      {userRoles.stock?.[role.key] ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Management (Admin Only) */}
      {isAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Grant Role to User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="userAddress">User Address</Label>
                <Input
                  id="userAddress"
                  value={roleForm.userAddress}
                  onChange={(e) => setRoleForm({ ...roleForm, userAddress: e.target.value })}
                  placeholder="0x..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contract">Contract</Label>
                <select
                  id="contract"
                  value={roleForm.contract}
                  onChange={(e) => setRoleForm({ 
                    ...roleForm, 
                    contract: e.target.value,
                    selectedRole: e.target.value === 'registry' ? 'MEDICAL_AGENT_ROLE' : 'LOGISTIC_MANAGER_ROLE'
                  })}
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="registry">Registry Contract</option>
                  <option value="stock">Stock Contract</option>
                </select>
              </div>

              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={roleForm.selectedRole}
                  onChange={(e) => setRoleForm({ ...roleForm, selectedRole: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {availableRoles[roleForm.contract].map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={handleGrantRole}
                disabled={loading}
                className="w-full bg-button hover:bg-primaryDark text-white"
              >
                {loading ? 'Granting Role...' : 'Grant Role'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Available Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-lg text-gray-800 mb-3">Registry Contract Roles</h4>
              <div className="space-y-3">
                {availableRoles.registry.map((role) => (
                  <div key={role.key} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-800">{role.name}</h5>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                      <Badge variant="outline">{role.key}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg text-gray-800 mb-3">Stock Contract Roles</h4>
              <div className="space-y-3">
                {availableRoles.stock.map((role) => (
                  <div key={role.key} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-800">{role.name}</h5>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                      <Badge variant="outline">{role.key}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isAdmin() && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-amber-800 font-medium">Administrator Access Required</p>
                <p className="text-amber-700 text-sm">
                  You need administrator privileges to manage user roles. Contact a system administrator to grant you the necessary permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}