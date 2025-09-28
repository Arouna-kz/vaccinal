// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./VaccineStock.sol";

/**
* @title VaccinRegistry
* @dev Flexible contract for tracking various vaccination schedules, managing
* AEFIs, and minting NFT certificates.
* This contract is deployed on Hedera EVM.
*/
contract VaccinRegistry is ERC721, ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;
    VaccineStock private stockContract;

    // --- Roles ---
    bytes32 public constant MEDICAL_AGENT_ROLE = keccak256("MEDICAL_AGENT_ROLE");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    bytes32[] private _allVaccinationTypeIds;

    // --- Counters ---
    Counters.Counter private _patientIds;
    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _mapiIds;

    /**
    * @dev Defines a vaccine type, such as "MPOX" or "COVID-19".
    * @param typeId Unique ID generated from the name (keccak256).
    * @param name Human-readable name of the vaccine.
    * @param requiredDoses The number of doses to complete the schema.
    * @param exists To check if the type was added correctly.
    */
    struct VaccinationType {
        bytes32 typeId;
        string name;
        uint8 requiredDoses; 
        bool exists;
    }

    struct Dose {
        uint256 date;
        string centerId;
        string batchNumber;
    }

    /**
     * @dev Contains patient demographic information.
     * Vaccination data is now separate.
     */
    struct Patient {
        uint256 patientId;
        address patientAddress;
        string uniquePatientCode;
        string professionalCategory;
        uint256 registrationDate;
        bool exists;
    }
    
    /**
     * @dev NEW STRUCTURE: Follows a patient's vaccination journey for ONE vaccine.
     */
    struct PatientVaccination {
        Dose[] administeredDoses;   
        uint256 certificateTokenId; 
        bool isComplete;
    }

    struct MAPI {
        uint256 mapiId;
        uint256 patientId;
        uint256 declarationDate;
        string description;
        address reportingAgent;
    }

    // --- MAPPINGS ---
    mapping(bytes32 => VaccinationType) private _vaccinationTypes; // typeId => VaccinationType
    mapping(uint256 => Patient) private _patients; // patientId => Patient
    mapping(string => uint256) private _patientCodeToId; // uniquePatientCode => patientId
    
    // Main mapping for flexibility: patientId => typeId => Vaccination pathway
    mapping(uint256 => mapping(bytes32 => PatientVaccination)) private _patientVaccinations;
    
    mapping(uint256 => MAPI[]) private _patientMAPIs;
    MAPI[] private _allMAPIs;

    // --- Events---
    event PatientRegistered(uint256 indexed patientId, string uniquePatientCode, uint256 registrationDate);
    event VaccinationTypeAdded(bytes32 indexed typeId, string name, uint8 requiredDoses);
    event DoseRegistered(uint256 indexed patientId, bytes32 indexed vaccinationTypeId, uint256 doseNumber);
    event VaccinationCompleted(uint256 indexed patientId, bytes32 indexed vaccinationTypeId);
    event CertificateMinted(uint256 indexed patientId, uint256 indexed tokenId, address to);
    event MAPIDeclared(uint256 indexed mapiId, uint256 indexed patientId, address reportingAgent);

    // --- Errors ---
    error PatientNotFound(string uniquePatientCode);
    error PatientAlreadyExists(string uniquePatientCode);
    error VaccinationTypeNotFound(bytes32 typeId);
    error VaccinationAlreadyComplete();
    error DoseNumberExceedsRequirement();
    error InsufficientStock(string centerId, bytes32 vaccinationTypeId, uint256 currentStock);

    constructor() ERC721("Certificat de Vaccination", "CDV") {
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MEDICAL_AGENT_ROLE, msg.sender);
    }
    
    // --- NEW ADMINISTRATIVE FUNCTIONS---

    /**
     * @dev Adds or updates a new vaccine type.
     * Only an administrator can call this function.
     */
    function addVaccinationType(string calldata name, uint8 requiredDoses) external onlyRole(ADMIN_ROLE) {
        require(requiredDoses > 0, "Required doses must be at least 1");
        bytes32 typeId = keccak256(abi.encodePacked(name));
        
        _vaccinationTypes[typeId] = VaccinationType({
            typeId: typeId,
            name: name,
            requiredDoses: requiredDoses,
            exists: true
        });
        
        _allVaccinationTypeIds.push(typeId);

        emit VaccinationTypeAdded(typeId, name, requiredDoses);
    }

    
    /**
     * @dev Step 1: Registers a patient in the system.
     * Must be called before registering a dose.
     */
    function registerPatient(
        address patientAddress,
        string calldata uniquePatientCode,
        string calldata professionalCategory
    ) external onlyRole(MEDICAL_AGENT_ROLE) {
        if (_patientCodeToId[uniquePatientCode] != 0) {
            revert PatientAlreadyExists(uniquePatientCode);
        }

        _patientIds.increment();
        uint256 newPatientId = _patientIds.current();

        _patients[newPatientId] = Patient({
            patientId: newPatientId,
            patientAddress: patientAddress,
            uniquePatientCode: uniquePatientCode,
            professionalCategory: professionalCategory,
             registrationDate: block.timestamp,
            exists: true
        });
        
        _patientCodeToId[uniquePatientCode] = newPatientId;

        emit PatientRegistered(newPatientId, uniquePatientCode, block.timestamp);
    }

    /**
    * @notice Configures the stock contract (callable only by the admin)
    * @param _stockAddress The address of the VaccineStock contract
    * @dev This function must be called after deployment to link the contracts
    */
    function setStockContract(address _stockAddress) external onlyRole(ADMIN_ROLE) {
        require(_stockAddress != address(0), "Invalid address");
        stockContract = VaccineStock(_stockAddress);
    }

    
    /**
    * @dev Step 2: Registers a dose for a given patient and vaccine type.
    * Triggers the NFT mint if the vaccination schedule is completed.
    */
    function registerDose(
        string calldata uniquePatientCode,
        bytes32 vaccinationTypeId,
        string calldata centerId,
        string calldata batchNumber,
        string calldata metadataURI
    ) external onlyRole(MEDICAL_AGENT_ROLE) {
        // Initial checks
        uint256 patientId = _patientCodeToId[uniquePatientCode];
        if (patientId == 0) revert PatientNotFound(uniquePatientCode);
        
        if (!_vaccinationTypes[vaccinationTypeId].exists) revert VaccinationTypeNotFound(vaccinationTypeId);
        
        PatientVaccination storage vaccination = _patientVaccinations[patientId][vaccinationTypeId];
        if (vaccination.isComplete) revert VaccinationAlreadyComplete();
        
        if (vaccination.administeredDoses.length >= _vaccinationTypes[vaccinationTypeId].requiredDoses) 
            revert DoseNumberExceedsRequirement();

        // Stock Check
        (uint256 currentStock,) = stockContract.getStock(centerId, vaccinationTypeId);
        if (currentStock == 0) revert InsufficientStock(centerId, vaccinationTypeId, currentStock);

        // Dose recording
        vaccination.administeredDoses.push(Dose(block.timestamp, centerId, batchNumber));
        stockContract.removeStock(centerId, vaccinationTypeId, 1);

        emit DoseRegistered(patientId, vaccinationTypeId, vaccination.administeredDoses.length);

        //Checking the completeness of the vaccination schedule
        if (vaccination.administeredDoses.length == _vaccinationTypes[vaccinationTypeId].requiredDoses) {
            vaccination.isComplete = true;
            emit VaccinationCompleted(patientId, vaccinationTypeId);
            _mintCertificate(_patients[patientId].patientAddress, patientId, vaccinationTypeId, metadataURI);
        }
    }
    
    /**
     * @dev Declares a MAPI. The logic remains unchanged.
     */
    function declareMAPI(string calldata uniquePatientCode, string calldata description) external onlyRole(MEDICAL_AGENT_ROLE) {
        uint256 patientId = _patientCodeToId[uniquePatientCode];
        if (patientId == 0) revert PatientNotFound(uniquePatientCode);

        _mapiIds.increment();
        uint256 newMapiId = _mapiIds.current();
        
        MAPI memory newMAPI = MAPI({
            mapiId: newMapiId,
            patientId: patientId,
            declarationDate: block.timestamp,
            description: description,
            reportingAgent: msg.sender
        });
        
        _patientMAPIs[patientId].push(newMAPI);
        _allMAPIs.push(newMAPI);

        emit MAPIDeclared(newMapiId, patientId, msg.sender);
    }

    /**
     * @dev Internal function to mint the NFT.
     * Now associates the tokenId with the specific vaccination pathway.
     */
    function _mintCertificate(address patientAddress, uint256 patientId, bytes32 vaccinationTypeId, string calldata metadataURI) internal {
        _tokenIdCounter.increment();
        uint256 newItemId = _tokenIdCounter.current();

        _safeMint(patientAddress, newItemId);
        _setTokenURI(newItemId, metadataURI);

        _patientVaccinations[patientId][vaccinationTypeId].certificateTokenId = newItemId;

        emit CertificateMinted(patientId, newItemId, patientAddress);
    }
    
    // --- Playback functions ---

    /**
     * @notice Retrieves patient information by unique patient code.
     * @dev Looks up the internal mapping `_patientCodeToId` to resolve the patient ID.
     *      Reverts with {PatientNotFound} if no patient is associated with the given code.
     * @param uniquePatientCode The unique identifier string assigned to the patient.
     * @return The {Patient} struct containing all stored patient details.
     */
    function getPatientInfo(string calldata uniquePatientCode) external view returns (Patient memory) {
        uint256 patientId = _patientCodeToId[uniquePatientCode];
        if (patientId == 0) revert PatientNotFound(uniquePatientCode);
        return _patients[patientId];
    }

    /**
    * @dev Retrieves all patients registered in the system
    * @return patients An array of all Patient structures
    */
    function getAllPatients() external view returns (Patient[] memory) {
        uint256 totalPatients = _patientIds.current();
        Patient[] memory patients = new Patient[](totalPatients);
        
        for (uint256 i = 1; i <= totalPatients; i++) {
            patients[i-1] = _patients[i];
        }
        
        return patients;
    }

    /**
    * @dev Retrieves the patient code by ID
    * @param patientId The patient's ID
    * @return uniquePatientCode The patient's unique code
    */
    function getPatientCodeById(uint256 patientId) external view returns (string memory) {
        require(_patients[patientId].exists, "Patient does not exist");
        return _patients[patientId].uniquePatientCode;
    }
    
    /**
     * @dev NEW: Retrieves the status of a specific vaccination for a patient.
     */
    function getPatientVaccinationStatus(string calldata uniquePatientCode, bytes32 vaccinationTypeId) external view returns (PatientVaccination memory) {
        uint256 patientId = _patientCodeToId[uniquePatientCode];
        if (patientId == 0) revert PatientNotFound(uniquePatientCode);
        
        if (!_vaccinationTypes[vaccinationTypeId].exists) revert VaccinationTypeNotFound(vaccinationTypeId);
        
        return _patientVaccinations[patientId][vaccinationTypeId];
    }

    /**
    * @dev Retrieves all vaccination types registered in the system.
    * @return types An array containing all existing VaccinationTypes.
    */
    function getAllVaccinationTypes() external view returns (VaccinationType[] memory) {
        VaccinationType[] memory types = new VaccinationType[](_allVaccinationTypeIds.length);
        
        for (uint256 i = 0; i < _allVaccinationTypeIds.length; i++) {
            types[i] = _vaccinationTypes[_allVaccinationTypeIds[i]];
        }
        
        return types;
    }

    /**
     * @dev NEW: Retrieves information about a vaccine type.
     * To get the `typeId`, your application can use `ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MPOX"))`.
     */
    function getVaccinationTypeInfo(bytes32 typeId) external view returns (VaccinationType memory) {
        if (!_vaccinationTypes[typeId].exists) revert VaccinationTypeNotFound(typeId);
        return _vaccinationTypes[typeId];
    }

    /**
     * @notice Retrieves all MAPIs associated with a specific patient.
     * @dev Uses the mapping `_patientCodeToId` to resolve the patient's ID and 
     *      then fetches all MAPIs from `_patientMAPIs`.
     *      Reverts with {PatientNotFound} if the patient does not exist.
     * @param uniquePatientCode The unique identifier string assigned to the patient.
     * @return An array of {MAPI} structs linked to the specified patient.
     */
    function getMAPIsByPatient(string calldata uniquePatientCode) 
        external 
        view 
        returns (MAPI[] memory) 
    {
        uint256 patientId = _patientCodeToId[uniquePatientCode];
        if (patientId == 0) revert PatientNotFound(uniquePatientCode);
        return _patientMAPIs[patientId];
    }

    /**
     * @notice Retrieves all MAPIs stored in the system, regardless of patient.
     * @return An array containing every {MAPI} struct recorded globally.
     */
    function getAllMAPIs() external view returns (MAPI[] memory) {
        return _allMAPIs;
    }

    /**
     * @dev Internal hook for handling ERC721 token transfers and mint/burn updates.
     *      This function overrides the parent implementation in {ERC721}.
     * @param to The address receiving the token.
     * @param tokenId The ID of the token being updated.
     * @param auth The authorized address initiating the update.
     * @return The address that previously owned the token.
     */
    function _update(address to, uint256 tokenId, address auth) 
        internal 
        override(ERC721) 
        returns (address) 
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Returns the metadata URI for a given token ID.
     * @dev Overrides both {ERC721URIStorage} and {ERC721}.
     * @param tokenId The ID of the token to query.
     * @return A string representing the metadata URI of the token.
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override(ERC721URIStorage, ERC721) 
        returns (string memory) 
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Checks if the contract supports a given interface.
     * @dev Required for ERC165 compatibility. Overrides multiple base contracts.
     * @param interfaceId The interface identifier, as specified in ERC165.
     * @return True if the interface is supported, false otherwise.
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721URIStorage, AccessControl, ERC721) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

}