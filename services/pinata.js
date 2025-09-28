/**
 * @fileoverview Pinata IPFS service
 * @description Handles file uploads and metadata management with Pinata
 */

const PINATA_API_KEY = process.env.PINATA_API_KEY || process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY || process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;
const PINATA_BASE_URL = 'https://api.pinata.cloud';

/**
 * Upload file to IPFS via Pinata
 * @param {File} file 
 * @param {string} name 
 * @returns {Promise<{ipfsHash: string, size: number}>}
 */
export async function uploadFileToPinata(file, name) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: name,
      keyvalues: {
        uploadedAt: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    const response = await fetch(`${PINATA_BASE_URL}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to Pinata');
    }

    const result = await response.json();
    return {
      ipfsHash: result.IpfsHash,
      size: result.PinSize
    };
  } catch (error) {
    console.error('Error uploading file to Pinata:', error);
    throw error;
  }
}

/**
 * Upload JSON metadata to IPFS via Pinata
 * @param {Object} jsonData 
 * @param {string} name 
 * @returns {Promise<{ipfsHash: string, size: number}>}
 */
export async function uploadJSONToPinata(jsonData, name) {
  try {
    const response = await fetch(`${PINATA_BASE_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      },
      body: JSON.stringify({
        pinataContent: jsonData,
        pinataMetadata: {
          name: name
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to upload JSON to Pinata');
    }

    const result = await response.json();
    return {
      ipfsHash: result.IpfsHash,
      size: result.PinSize
    };
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    throw error;
  }
}

/**
 * Get file from IPFS via Pinata gateway
 * @param {string} ipfsHash 
 * @returns {Promise<Response>}
 */
export async function getFileFromIPFS(ipfsHash) {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
    
    if (!response.ok) {
      throw new Error('Failed to retrieve file from IPFS');
    }

    return response;
  } catch (error) {
    console.error('Error getting file from IPFS:', error);
    throw error;
  }
}

/**
 * Get JSON data from IPFS
 * @param {string} ipfsHash 
 * @returns {Promise<Object>}
 */
export async function getJSONFromIPFS(ipfsHash) {
  try {
    const response = await getFileFromIPFS(ipfsHash);
    const jsonData = await response.json();
    return jsonData;
  } catch (error) {
    console.error('Error getting JSON from IPFS:', error);
    throw error;
  }
}

/**
 * List all pinned files
 * @returns {Promise<Array>}
 */
export async function listPinnedFiles() {
  try {
    const response = await fetch(`${PINATA_BASE_URL}/data/pinList`, {
      method: 'GET',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      }
    });

    if (!response.ok) {
      throw new Error('Failed to list pinned files');
    }

    const result = await response.json();
    return result.rows;
  } catch (error) {
    console.error('Error listing pinned files:', error);
    throw error;
  }
}

/**
 * Unpin file from IPFS
 * @param {string} ipfsHash 
 * @returns {Promise<boolean>}
 */
export async function unpinFile(ipfsHash) {
  try {
    const response = await fetch(`${PINATA_BASE_URL}/pinning/unpin/${ipfsHash}`, {
      method: 'DELETE',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_API_KEY,
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error unpinning file:', error);
    throw error;
  }
}