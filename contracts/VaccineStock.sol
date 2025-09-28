// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
* @title VaccineStock
* @dev Contract for managing the inventory of multiple vaccine types per center.
* Allows quantity tracking, threshold definition, and alerts by vaccine type.@title VaccineStock
* @dev Contract for managing the inventory of multiple vaccine types per center.
* Allows quantity tracking, threshold definition, and alerts by vaccine type.
*/
contract VaccineStock is AccessControl {

    // Role for logisticians authorized to manage stocks.
    bytes32 public constant LOGISTIC_MANAGER_ROLE = keccak256("LOGISTIC_MANAGER_ROLE");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    string[] private _allCenterIds;

    /**
     * @dev Contains stock information for ONE specific vaccine type.
     */
    struct VaccineTypeStock {
        uint256 currentQuantity;
        uint256 criticalThreshold;
    }

    /**
     * @dev Represents a center and contains a mapping of stocks for each vaccine type.
     */
    struct CenterStock {
        string centerId;
        // The key mapping: typeId => stock details
        mapping(bytes32 => VaccineTypeStock) stockByType;
        bool exists;
    }

    // The main mapping remains the same, but the structure it contains is richer.
    mapping(string => CenterStock) public stockByCenter;

    // --- Events updated to include vaccine type ---
    event StockUpdated(string indexed centerId, bytes32 indexed vaccinationTypeId, int256 quantityChange, uint256 newQuantity, address updater);
    event CenterAdded(string indexed centerId, address adder);
    event CriticalStockAlert(string indexed centerId, bytes32 indexed vaccinationTypeId, uint256 currentQuantity, uint256 threshold);
    event VaccineTypeConfiguredForCenter(string indexed centerId, bytes32 indexed vaccinationTypeId, uint256 initialQuantity, uint256 criticalThreshold);


    // --- Custom errors ---
    error CenterNotFound(string centerId);
    error VaccineTypeNotConfiguredForCenter(string centerId, bytes32 vaccinationTypeId);
    error InsufficientStock(uint256 requested, uint256 available);
    error CenterAlreadyExists(string centerId);

    constructor() {
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(LOGISTIC_MANAGER_ROLE, msg.sender);
    }

    /**
     * @dev Step 1: Add a new health center (without initial stock).
     */
    function addCenter(string calldata centerId) 
        external 
        onlyRole(LOGISTIC_MANAGER_ROLE) 
    {
        if (stockByCenter[centerId].exists) {
            revert CenterAlreadyExists(centerId);
        }

        stockByCenter[centerId].centerId = centerId;
        stockByCenter[centerId].exists = true;

        _allCenterIds.push(centerId);

        emit CenterAdded(centerId, msg.sender);
    }

    /**
     * @dev NEW - Step 2: Configures the inventory for a vaccine type in a center.
     * Must be called after the center is created for each vaccine type managed.
     */
    function configureVaccineStock(
        string calldata centerId, 
        bytes32 vaccinationTypeId, 
        uint256 initialQuantity, 
        uint256 criticalThreshold
    ) external onlyRole(LOGISTIC_MANAGER_ROLE) {
        if (!stockByCenter[centerId].exists) {
            revert CenterNotFound(centerId);
        }

        CenterStock storage center = stockByCenter[centerId];
        center.stockByType[vaccinationTypeId] = VaccineTypeStock({
            currentQuantity: initialQuantity,
            criticalThreshold: criticalThreshold
        });

        emit VaccineTypeConfiguredForCenter(centerId, vaccinationTypeId, initialQuantity, criticalThreshold);
    }


    /**
     * @dev Updates the stock of a specific vaccine type in a center (add).
     */
    function addStock(string calldata centerId, bytes32 vaccinationTypeId, uint256 quantityToAdd) 
        external 
        onlyRole(LOGISTIC_MANAGER_ROLE) 
    {
        if (!stockByCenter[centerId].exists) {
            revert CenterNotFound(centerId);
        }

        // Note: Nested mapping is accessed directly.
        VaccineTypeStock storage vaccineStock = stockByCenter[centerId].stockByType[vaccinationTypeId];
        
        // We could add a check to ensure that the type has been configured (threshold > 0), but this is not mandatory.
        vaccineStock.currentQuantity += quantityToAdd;

        emit StockUpdated(centerId, vaccinationTypeId, int256(quantityToAdd), vaccineStock.currentQuantity, msg.sender);
    }

    /**
     * @dev Updates the stock of a specific vaccine type (withdrawal).
     */
    function removeStock(string calldata centerId, bytes32 vaccinationTypeId, uint256 quantityToRemove) 
        external 
        onlyRole(LOGISTIC_MANAGER_ROLE) 
    {
        if (!stockByCenter[centerId].exists) {
            revert CenterNotFound(centerId);
        }
        
        VaccineTypeStock storage vaccineStock = stockByCenter[centerId].stockByType[vaccinationTypeId];
        uint256 currentStock = vaccineStock.currentQuantity;
        
        // We check that the vaccine type has been initialized for this center
        if (vaccineStock.criticalThreshold == 0 && currentStock == 0) {
            revert VaccineTypeNotConfiguredForCenter(centerId, vaccinationTypeId);
        }

        if (quantityToRemove > currentStock) {
            revert InsufficientStock(quantityToRemove, currentStock);
        }

        vaccineStock.currentQuantity -= quantityToRemove;

        emit StockUpdated(centerId, vaccinationTypeId, -int256(quantityToRemove), vaccineStock.currentQuantity, msg.sender);

        // Triggers an alert if the stock falls below the critical threshold for this vaccine
        if (currentStock > vaccineStock.criticalThreshold && vaccineStock.currentQuantity <= vaccineStock.criticalThreshold) {
            emit CriticalStockAlert(centerId, vaccinationTypeId, vaccineStock.currentQuantity, vaccineStock.criticalThreshold);
        }
    }

    /**
    * @dev Retrieves the list of all vaccination centers registered in the system.
    * @return centers An array containing the IDs of all centers.
    */
    function getAllCenters() external view returns (string[] memory) {
        return _allCenterIds;
    }

    /**
     * @dev Allows you to view the current stock of a specific vaccine type at a center.
     */
    function getStock(string calldata centerId, bytes32 vaccinationTypeId) 
        external 
        view 
        returns (uint256 currentQuantity, uint256 criticalThreshold) 
    {
        if (!stockByCenter[centerId].exists) {
            revert CenterNotFound(centerId);
        }
        VaccineTypeStock storage vStock = stockByCenter[centerId].stockByType[vaccinationTypeId];
        return (vStock.currentQuantity, vStock.criticalThreshold);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}