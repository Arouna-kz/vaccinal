'use client';

import { useState, useEffect } from 'react';
import { Upload, File, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadFileToPinata, uploadJSONToPinata } from '@/services/pinata';
import toast from 'react-hot-toast';

/**
 * Metadata upload component for IPFS via Pinata
 * @returns {JSX.Element}
 */
export default function MetadataUpload() {
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    patientCode: '',
    documentType: 'certificate'
  });

  // Reset data when component unmounts or wallet disconnects
  useEffect(() => {
    return () => {
      setUploadedFiles([]);
      setFormData({
        name: '',
        description: '',
        patientCode: '',
        documentType: 'certificate'
      });
    };
  }, []);
  /**
   * Handle file upload
   */
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const result = await uploadFileToPinata(file, formData.name || file.name);
      
      const newUpload = {
        id: Date.now(),
        name: file.name,
        ipfsHash: result.ipfsHash,
        size: result.size,
        type: 'file',
        url: `https://gateway.pinata.cloud/ipfs/${result.ipfsHash}`
      };

      setUploadedFiles(prev => [...prev, newUpload]);
      toast.success(`File uploaded successfully: ${result.ipfsHash}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle metadata JSON upload
   */
  const handleMetadataUpload = async () => {
    if (!formData.name || !formData.patientCode) {
      toast.error('Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      const metadata = {
        name: formData.name,
        description: formData.description,
        patientCode: formData.patientCode,
        documentType: formData.documentType,
        timestamp: new Date().toISOString(),
        attributes: [
          {
            trait_type: 'Document Type',
            value: formData.documentType
          },
          {
            trait_type: 'Patient Code',
            value: formData.patientCode
          },
          {
            trait_type: 'Upload Date',
            value: new Date().toLocaleDateString()
          }
        ]
      };

      const result = await uploadJSONToPinata(metadata, `${formData.patientCode}-${formData.documentType}-metadata`);
      
      const newUpload = {
        id: Date.now(),
        name: `${formData.name} (Metadata)`,
        ipfsHash: result.ipfsHash,
        size: result.size,
        type: 'json',
        url: `https://gateway.pinata.cloud/ipfs/${result.ipfsHash}`
      };

      setUploadedFiles(prev => [...prev, newUpload]);
      toast.success(`Metadata uploaded successfully: ${result.ipfsHash}`);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        patientCode: '',
        documentType: 'certificate'
      });
    } catch (error) {
      console.error('Error uploading metadata:', error);
      toast.error('Failed to upload metadata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy IPFS hash to clipboard
   */
  const copyToClipboard = (hash) => {
    navigator.clipboard.writeText(hash);
    toast.success('IPFS hash copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Téléchargement de fichiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileName">Nom du fichier (optionnel)</Label>
              <Input
                id="fileName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom personnalisé pour le fichier"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fileInput">Sélectionner un fichier</Label>
              <Input
                id="fileInput"
                type="file"
                onChange={handleFileUpload}
                disabled={loading}
                className="mt-1"
                accept=".pdf,.jpg,.jpeg,.png,.txt,.json"
              />
              <p className="text-xs text-gray-600 mt-1">
                Formats supportés: PDF, JPG, PNG, TXT, JSON
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <File className="w-5 h-5 text-primary" />
            Métadonnées de certificat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="metaName">Nom du document *</Label>
              <Input
                id="metaName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Certificat de vaccination MPOX"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Certificat de vaccination complète"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="patientCode">Code patient *</Label>
              <Input
                id="patientCode"
                value={formData.patientCode}
                onChange={(e) => setFormData({ ...formData, patientCode: e.target.value })}
                placeholder="PAT-001"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="documentType">Type de document</Label>
              <select
                id="documentType"
                value={formData.documentType}
                onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                className="w-full mt-1 p-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="certificate">Certificat</option>
                <option value="medical_report">Rapport médical</option>
                <option value="consent_form">Formulaire de consentement</option>
                <option value="adverse_event">Événement indésirable</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <Button
              onClick={handleMetadataUpload}
              disabled={loading || !formData.name || !formData.patientCode}
              className="w-full bg-button hover:bg-primaryDark text-white"
            >
              {loading ? 'Téléchargement...' : 'Télécharger les métadonnées'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fichiers téléchargés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {file.type === 'json' ? (
                      <File className="w-5 h-5 text-primary" />
                    ) : (
                      <Upload className="w-5 h-5 text-primary" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-gray-600">
                        IPFS: {file.ipfsHash.substring(0, 20)}... ({(file.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(file.ipfsHash)}
                    >
                      Copier Hash
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Link className="w-3 h-3 mr-1" />
                      Voir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}