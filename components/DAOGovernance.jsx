'use client';
// Etes-vous d'accord avec l'ajout d'un nouveau type de vaccin 
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Vote, Plus, Clock, CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { useVGOVBalance } from '@/hooks/useVGOVBalance';
import { 
  getVaccineDAOContract,
  createProposal,
  castVote,
  executeProposal,
  getProposalState,
  getProposalVotes,
  hasVoted,
  getVotingPower,
  getProposalDeadline,
  getQuorum,
  getProposalThreshold,
  PROPOSAL_STATES,
  VOTE_TYPES,
  getAllProposals, 
  getProposalCount,
  getProposalById
} from '@/services/contracts/vaccineDAO';
import toast from 'react-hot-toast';

/**
 * DAO Governance component
 * @returns {JSX.Element}
 */
export default function DAOGovernance() {
  const { signer, address, isConnected } = useWallet();
  const { balance: votingPower, formattedBalance } = useVGOVBalance();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('proposals');
  const [proposals, setProposals] = useState([]);
  const [proposalThreshold, setProposalThreshold] = useState('0');
  
  // Proposal creation form
  const [proposalForm, setProposalForm] = useState({
    title: '',
    description: '',
    targets: [''],
    values: ['0'],
    calldatas: ['0x'],
    actionType: 'custom'
  });

  // Predefined proposal templates
  const proposalTemplates = {
    addVaccineType: {
      title: 'Ajouter un nouveau type de vaccin',
      description: 'Proposition d\'ajout d\'un nouveau type de vaccin au registre',
      actionType: 'addVaccineType'
    },
    updateQuorum: {
      title: 'Modifier le quorum de vote',
      description: 'Proposition de modification du quorum requis pour les votes',
      actionType: 'updateQuorum'
    },
    grantRole: {
      title: 'Accorder un rôle utilisateur',
      description: 'Proposition d\'attribution d\'un rôle à un utilisateur',
      actionType: 'grantRole'
    }
  };

  /**
   * Load proposals (mock data for now)
   */
  const loadProposals = async () => {
    if (!signer || !address) return;

    try {
      const contract = getVaccineDAOContract(signer);
      
      // Récupérer les propositions depuis la blockchain
      const blockchainProposals = await getAllProposals(contract);
      
      // Enrichir avec les informations utilisateur
      const proposalsWithUserData = await Promise.all(
        blockchainProposals.map(async (proposal) => {
          try {
            const userHasVoted = await hasVoted(contract, proposal.id, address);
            const votingPowerAtProposal = await getVotingPower(
              contract, 
              address, 
              proposal.voteStart
            );
            
            return {
              ...proposal,
              title: extractTitleFromDescription(proposal.description),
              description: extractDescriptionFromDescription(proposal.description),
              hasVoted: userHasVoted,
              userVotingPower: votingPowerAtProposal,
              deadline: proposal.voteEnd * 1000, // Convert to milliseconds
              quorum: await getQuorum(contract, proposal.voteStart)
            };
          } catch (error) {
            console.warn(`Error enriching proposal ${proposal.id}:`, error);
            return proposal;
          }
        })
      );

      setProposals(proposalsWithUserData);
      
      // Fetch proposal threshold
      try {
        const threshold = await getProposalThreshold(contract);
        setProposalThreshold(threshold);
      } catch (error) {
        console.warn('Could not fetch proposal threshold:', error);
      }
    } catch (error) {
      console.error('Error loading proposals:', error);
      toast.error('Erreur lors du chargement des propositions');
      setProposals([]);
    }
  };

  // Helper functions to extract title and description
  const extractTitleFromDescription = (description) => {
    const lines = description.split('\n');
    return lines[0] || 'Sans titre';
  };

  const extractDescriptionFromDescription = (description) => {
    const lines = description.split('\n');
    return lines.slice(2).join('\n') || 'Aucune description détaillée';
  };


  // const loadProposals = async () => {
  //   if (!signer || !address) return;

  //   try {
  //     const contract = getVaccineDAOContract(signer);
      
  //     // Mock proposals data - in real implementation, you'd fetch from events or subgraph
  //     const mockProposals = [
  //       {
  //         id: '1',
  //         title: 'Ajouter le vaccin contre la grippe saisonnière',
  //         description: 'Proposition d\'ajout du vaccin contre la grippe saisonnière au registre des vaccins disponibles.',
  //         proposer: '0x1234...5678',
  //         state: 1, // Active
  //         forVotes: '1250',
  //         againstVotes: '340',
  //         abstainVotes: '110',
  //         deadline: Date.now() + 86400000 * 3, // 3 days from now
  //         hasVoted: false, // Will be updated below
  //         quorum: '1000'
  //       },
  //       {
  //         id: '2',
  //         title: 'Modifier le seuil de quorum à 15%',
  //         description: 'Proposition de modification du quorum requis pour l\'adoption des propositions de 10% à 15% de l\'offre totale de tokens.',
  //         proposer: '0x8765...4321',
  //         state: 4, // Succeeded
  //         forVotes: '2100',
  //         againstVotes: '890',
  //         abstainVotes: '210',
  //         deadline: Date.now() - 86400000, // 1 day ago
  //         hasVoted: false, // Will be updated below
  //         quorum: '1000'
  //       },
  //       {
  //         id: '3',
  //         title: 'Accorder le rôle d\'agent médical',
  //         description: 'Proposition d\'attribution du rôle d\'agent médical à l\'adresse 0xABC...DEF pour le centre médical de Paris.',
  //         proposer: '0x9876...1234',
  //         state: 0, // Pending
  //         forVotes: '0',
  //         againstVotes: '0',
  //         abstainVotes: '0',
  //         deadline: Date.now() + 86400000 * 7, // 7 days from now
  //         hasVoted: false, // Will be updated below
  //         quorum: '1000'
  //       }
  //     ];

  //     // Fetch actual hasVoted status for each proposal
  //     const proposalsWithVoteStatus = await Promise.all(
  //       mockProposals.map(async (proposal) => {
  //         try {
  //           // Fetch actual proposal state from blockchain
  //           const actualState = await getProposalState(contract, proposal.id);
  //           const userHasVoted = await hasVoted(contract, proposal.id, address);
  //           return {
  //             ...proposal,
  //             state: actualState,
  //             hasVoted: userHasVoted
  //           };
  //         } catch (error) {
  //           console.warn(`Could not fetch vote status for proposal ${proposal.id}:`, error);
  //           return {
  //             ...proposal,
  //             hasVoted: false // Default to false if we can't fetch the status
  //           };
  //         }
  //       })
  //     );

  //     setProposals(proposalsWithVoteStatus);
      
  //     // Fetch proposal threshold
  //     try {
  //       const threshold = await getProposalThreshold(contract);
  //       setProposalThreshold(threshold);
  //     } catch (error) {
  //       console.warn('Could not fetch proposal threshold:', error);
  //       setProposalThreshold('0');
  //     }
  //   } catch (error) {
  //     console.error('Error loading proposals:', error);
  //     // Fallback to mock data without vote status check
  //     setProposals([]);
  //   }
  // };

  /**
   * Handle proposal creation
   */
  // Dans votre composant, remplacez la fonction handleCreateProposal par :

const handleCreateProposal = async () => {
  if (!signer || !proposalForm.title || !proposalForm.description) {
    toast.error('Veuillez remplir tous les champs requis');
    return;
  }

  // Validation améliorée
  if (parseFloat(votingPower) < parseFloat(proposalThreshold)) {
    toast.error(`Seuil de proposition non atteint. Vous avez ${formattedBalance} VGOV, le seuil est ${parseFloat(proposalThreshold).toLocaleString('fr-FR')} VGOV`);
    return;
  }

  setLoading(true);
  try {
    const contract = getVaccineDAOContract(signer);
    
    // Préparer les paramètres selon le type d'action
    let targets = proposalForm.targets.filter(t => t && t.trim() !== '');
    let values = proposalForm.values.map(v => v || '0');
    let calldatas = proposalForm.calldatas.filter(c => c && c !== '0x');

    // Pour les propositions sans action spécifique, utiliser des valeurs par défaut
    if (targets.length === 0) {
      // Utiliser l'adresse du contrat DAO lui-même comme target par défaut
      targets = [process.env.NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS];
      values = ['0'];
      calldatas = ['0x']; // Aucune fonction appelée
    }

    // S'assurer que tous les tableaux ont la même longueur
    const maxLength = Math.max(targets.length, values.length, calldatas.length);
    targets = Array(maxLength).fill('').map((_, i) => targets[i] || process.env.NEXT_PUBLIC_CONTRACT_VACCINE_DAO_ADDRESS);
    values = Array(maxLength).fill('').map((_, i) => values[i] || '0');
    calldatas = Array(maxLength).fill('').map((_, i) => calldatas[i] || '0x');

    const description = `${proposalForm.title}\n\n${proposalForm.description}`;

    console.log('Final proposal parameters:', {
      targets,
      values,
      calldatas,
      descriptionLength: description.length
    });

    await createProposal(contract, targets, values, calldatas, description);
    
    toast.success('Proposition créée avec succès');
    
    // Réinitialiser le formulaire
    setProposalForm({
      title: '',
      description: '',
      targets: [''],
      values: ['0'],
      calldatas: ['0x'],
      actionType: 'custom'
    });
    
    // Recharger les propositions
    await loadProposals();
    
  } catch (error) {
    console.error('Error creating proposal:', error);
    
    // Messages d'erreur plus spécifiques
    if (error.message.includes('Voting power insuffisant')) {
      toast.error('Voting power insuffisant pour créer une proposition');
    } else if (error.message.includes('Transaction reverted')) {
      toast.error('La transaction a été rejetée par le contrat');
    } else if (error.message.includes('gas')) {
      toast.error('Erreur de gas. Vérifiez que vous avez suffisamment de fonds.');
    } else {
      toast.error('Échec de la création: ' + error.message);
    }
  } finally {
    setLoading(false);
  }
};

  // const handleCreateProposal = async () => {
  //   if (!signer || !proposalForm.title || !proposalForm.description) {
  //     toast.error('Veuillez remplir tous les champs requis');
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const contract = getVaccineDAOContract(signer);
      
  //     // For demo purposes, create a simple proposal
  //     const targets = proposalForm.targets.filter(t => t);
  //     const values = proposalForm.values.map(v => ethers.utils.parseEther(v || '0'));
  //     const calldatas = proposalForm.calldatas.filter(c => c);
  //     const description = `${proposalForm.title}\n\n${proposalForm.description}`;

  //     await createProposal(contract, targets, values, calldatas, description);
      
  //     toast.success('Proposition créée avec succès');
  //     setProposalForm({
  //       title: '',
  //       description: '',
  //       targets: [''],
  //       values: ['0'],
  //       calldatas: ['0x'],
  //       actionType: 'custom'
  //     });
      
  //     // Reload proposals
  //     await loadProposals();
  //   } catch (error) {
  //     console.error('Error creating proposal:', error);
  //     toast.error('Échec de la création de la proposition: ' + error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  /**
   * Handle voting on a proposal
   */
  const handleVote = async (proposalId, support, reason = '') => {
    if (!signer) return;

    setLoading(true);
    try {
      const contract = getVaccineDAOContract(signer);
      await castVote(contract, proposalId, support, reason);
      
      const voteText = support === VOTE_TYPES.FOR ? 'Pour' : 
                      support === VOTE_TYPES.AGAINST ? 'Contre' : 'Abstention';
      toast.success(`Vote "${voteText}" enregistré avec succès`);
      
      // Reload proposals
      await loadProposals();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Échec du vote: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get proposal state badge
   */
  const getStateBadge = (state) => {
    const stateConfig = {
      0: { label: 'En attente', color: 'bg-gray-100 text-gray-800' },
      1: { label: 'Actif', color: 'bg-blue-100 text-blue-800' },
      2: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
      3: { label: 'Défait', color: 'bg-red-100 text-red-800' },
      4: { label: 'Réussi', color: 'bg-green-100 text-green-800' },
      5: { label: 'En file', color: 'bg-yellow-100 text-yellow-800' },
      6: { label: 'Expiré', color: 'bg-gray-100 text-gray-800' },
      7: { label: 'Exécuté', color: 'bg-green-100 text-green-800' }
    };

    const config = stateConfig[state] || stateConfig[0];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  /**
   * Format time remaining
   */
  const formatTimeRemaining = (deadline) => {
    const now = Date.now();
    const diff = deadline - now;
    
    if (diff <= 0) return 'Expiré';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}j ${hours}h restantes`;
    return `${hours}h restantes`;
  };

  /**
   * Calculate vote percentage
   */
  const calculatePercentage = (votes, total) => {
    if (total === 0) return 0;
    return ((parseFloat(votes) / parseFloat(total)) * 100).toFixed(1);
  };

  // Load data on component mount
  useEffect(() => {
    if (!isConnected || !signer || !address) {
      // Reset data when disconnected
      setProposals([]);
      setProposalThreshold('0');
      setProposalForm({
        title: '',
        description: '',
        targets: [''],
        values: ['0'],
        calldatas: ['0x'],
        actionType: 'custom'
      });
      setActiveTab('proposals');
      return;
    }
    
    // Load data when connected
    if (isConnected && signer && address) {
      loadProposals();
    }
  }, [isConnected, signer, address]);

  if (!isConnected) {
    return (
      <div className="text-center p-8">
        <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          Veuillez connecter votre portefeuille pour accéder à la gouvernance DAO
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voting Power Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Votre pouvoir de vote
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Tokens VGOV détenus</p>
                <p className="text-2xl font-bold text-textPrimary">
                  {parseFloat(votingPower).toLocaleString('fr-FR')} VGOV
                </p>
              </div>
              <Vote className="w-8 h-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        <Button
          variant={activeTab === 'proposals' ? 'default' : 'outline'}
          onClick={() => setActiveTab('proposals')}
          className={activeTab === 'proposals' ? 'bg-button text-white' : ''}
        >
          <Vote className="w-4 h-4 mr-2" />
          Propositions
        </Button>
        <Button
          variant={activeTab === 'create' ? 'default' : 'outline'}
          onClick={() => setActiveTab('create')}
          className={activeTab === 'create' ? 'bg-button text-white' : ''}
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer une proposition
        </Button>
      </div>

      {/* Proposals Tab */}
      {activeTab === 'proposals' && (
        <div className="space-y-4">
          {proposals.length === 0 ? (
            <Card>
              <CardContent className="text-center p-8">
                <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucune proposition disponible</p>
              </CardContent>
            </Card>
          ) : (
            proposals.map((proposal) => {
              const totalVotes = parseFloat(proposal.forVotes) + 
                               parseFloat(proposal.againstVotes) + 
                               parseFloat(proposal.abstainVotes);
              
              return (
                <Card key={proposal.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{proposal.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Par {proposal.proposer}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStateBadge(proposal.state)}
                        {proposal.state === 1 && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            {formatTimeRemaining(proposal.deadline)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{proposal.description}</p>
                    
                    {/* Vote Results */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span>Pour ({calculatePercentage(proposal.forVotes, totalVotes)}%)</span>
                        <span>{parseFloat(proposal.forVotes).toLocaleString('fr-FR')} VGOV</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${calculatePercentage(proposal.forVotes, totalVotes)}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Contre ({calculatePercentage(proposal.againstVotes, totalVotes)}%)</span>
                        <span>{parseFloat(proposal.againstVotes).toLocaleString('fr-FR')} VGOV</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${calculatePercentage(proposal.againstVotes, totalVotes)}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span>Abstention ({calculatePercentage(proposal.abstainVotes, totalVotes)}%)</span>
                        <span>{parseFloat(proposal.abstainVotes).toLocaleString('fr-FR')} VGOV</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gray-500 h-2 rounded-full" 
                          style={{ width: `${calculatePercentage(proposal.abstainVotes, totalVotes)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quorum Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Quorum requis</span>
                        <span>{totalVotes.toLocaleString('fr-FR')} / {parseFloat(proposal.quorum).toLocaleString('fr-FR')} VGOV</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (totalVotes / parseFloat(proposal.quorum)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Voting Buttons */}
                    {proposal.state === 1 && !proposal.hasVoted && parseFloat(votingPower) > 0 && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleVote(proposal.id, VOTE_TYPES.FOR)}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Pour
                        </Button>
                        <Button
                          onClick={() => handleVote(proposal.id, VOTE_TYPES.AGAINST)}
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700 text-white flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Contre
                        </Button>
                        <Button
                          onClick={() => handleVote(proposal.id, VOTE_TYPES.ABSTAIN)}
                          disabled={loading}
                          variant="outline"
                          className="flex-1"
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Abstention
                        </Button>
                      </div>
                    )}

                    {proposal.hasVoted && (
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-blue-800 text-sm">Vous avez déjà voté sur cette proposition</p>
                      </div>
                    )}

                    {parseFloat(votingPower) === 0 && (
                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <p className="text-yellow-800 text-sm">Vous devez détenir des tokens VGOV pour voter</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Create Proposal Tab */}
      {activeTab === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Créer une nouvelle proposition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="proposalTitle">Titre de la proposition</Label>
                <Input
                  id="proposalTitle"
                  value={proposalForm.title}
                  onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                  placeholder="Titre descriptif de votre proposition"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="proposalDescription">Description détaillée</Label>
                <Textarea
                  id="proposalDescription"
                  value={proposalForm.description}
                  onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                  placeholder="Décrivez en détail votre proposition, ses objectifs et ses implications..."
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div>
                <Label htmlFor="actionType">Type d'action</Label>
                <select
                  id="actionType"
                  value={proposalForm.actionType}
                  onChange={(e) => setProposalForm({ ...proposalForm, actionType: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="custom">Action personnalisée</option>
                  <option value="addVaccineType">Ajouter un type de vaccin</option>
                  <option value="updateQuorum">Modifier le quorum</option>
                  <option value="grantRole">Accorder un rôle</option>
                </select>
              </div>

              {proposalForm.actionType === 'custom' && (
                <>
                  <div>
                    <Label htmlFor="targets">Adresses des contrats cibles</Label>
                    <Input
                      id="targets"
                      value={proposalForm.targets[0]}
                      onChange={(e) => setProposalForm({ 
                        ...proposalForm, 
                        targets: [e.target.value] 
                      })}
                      placeholder="0x..."
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="calldatas">Données d'appel (calldata)</Label>
                    <Input
                      id="calldatas"
                      value={proposalForm.calldatas[0]}
                      onChange={(e) => setProposalForm({ 
                        ...proposalForm, 
                        calldatas: [e.target.value] 
                      })}
                      placeholder="0x..."
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium">Information importante</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Vous devez détenir des tokens VGOV pour créer une proposition. 
                      La création d'une proposition nécessite un seuil minimum de {parseFloat(proposalThreshold).toLocaleString('fr-FR')} VGOV.
                      Vous avez actuellement {formattedBalance} VGOV.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleCreateProposal}
                disabled={loading || !proposalForm.title || !proposalForm.description || parseFloat(votingPower) < parseFloat(proposalThreshold)}
                className="w-full bg-button hover:bg-primaryDark text-white"
              >
                {loading ? 'Création en cours...' : 'Créer la proposition'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}