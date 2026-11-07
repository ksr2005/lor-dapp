// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LetterOfRecommendation (LoR) Smart Contract
 * @author Tutedude Web3 Mastery
 * @notice Manages student registrations, recommendation requests, and approvals by authorized faculty/approvers.
 */
contract LetterOfRecommendation {
    address public owner;
    uint256 public studentCount;

    enum RequestStatus {
        None,        // 0: Registered, but recommendation not yet requested
        Requested,   // 1: Recommendation requested, pending approval
        Approved     // 2: Recommendation approved by an authorized approver
    }

    struct Student {
        uint256 id;
        string name;
        string course;
        string email;
        address studentAddress;
        RequestStatus status;
        address approvedBy;
        string ipfsHash;     // Optional IPFS hash / CID / document reference for recommendation
        uint256 requestedAt;
        uint256 approvedAt;
    }

    // Mapping from student ID to Student details
    mapping(uint256 => Student) public students;

    // Mapping to track authorized approvers (faculty / professors / mentors)
    mapping(address => bool) public isApprover;

    // Events
    event StudentAdded(
        uint256 indexed studentId,
        string name,
        string course,
        string email,
        address indexed studentAddress
    );

    event RecommendationRequested(
        uint256 indexed studentId,
        address indexed requestedBy,
        uint256 timestamp
    );

    event RecommendationApproved(
        uint256 indexed studentId,
        address indexed approver,
        string ipfsHash,
        uint256 timestamp
    );

    event ApproverAuthorized(address indexed approver);
    event ApproverDeauthorized(address indexed approver);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can perform this action");
        _;
    }

    modifier onlyApprover() {
        require(
            isApprover[msg.sender] || msg.sender == owner,
            "Only authorized approvers or owner can perform this action"
        );
        _;
    }

    modifier studentExists(uint256 _studentId) {
        require(_studentId > 0 && _studentId <= studentCount, "Student ID does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
        isApprover[msg.sender] = true; // Owner is authorized as an approver by default
    }

    /**
     * @notice Authorizes a faculty member or reviewer to approve LoRs.
     * @param _approver Address of the approver to authorize.
     */
    function authorizeApprover(address _approver) external onlyOwner {
        require(_approver != address(0), "Invalid approver address");
        require(!isApprover[_approver], "Address is already an authorized approver");
        isApprover[_approver] = true;
        emit ApproverAuthorized(_approver);
    }

    /**
     * @notice Deauthorizes an approver.
     * @param _approver Address of the approver to deauthorize.
     */
    function deauthorizeApprover(address _approver) external onlyOwner {
        require(_approver != address(0), "Invalid approver address");
        require(isApprover[_approver], "Address is not an authorized approver");
        require(_approver != owner, "Cannot deauthorize the contract owner");
        isApprover[_approver] = false;
        emit ApproverDeauthorized(_approver);
    }

    /**
     * @notice Transfers contract ownership to a new address.
     * @param _newOwner Address of the new owner.
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    /**
     * @notice Registers a new student into the system.
     * @param _name Full name of the student.
     * @param _course Course or department of the student.
     * @param _email Contact email of the student.
     * @return studentId The newly assigned unique student ID.
     */
    function addStudent(
        string memory _name,
        string memory _course,
        string memory _email
    ) external returns (uint256) {
        require(bytes(_name).length > 0, "Student name cannot be empty");
        require(bytes(_course).length > 0, "Student course cannot be empty");
        require(bytes(_email).length > 0, "Student email cannot be empty");

        studentCount++;
        uint256 newId = studentCount;

        students[newId] = Student({
            id: newId,
            name: _name,
            course: _course,
            email: _email,
            studentAddress: msg.sender,
            status: RequestStatus.None,
            approvedBy: address(0),
            ipfsHash: "",
            requestedAt: 0,
            approvedAt: 0
        });

        emit StudentAdded(newId, _name, _course, _email, msg.sender);
        return newId;
    }

    /**
     * @notice Requests a letter of recommendation for a given student ID.
     * @param _studentId The unique student ID.
     */
    function requestRecommendation(uint256 _studentId) external studentExists(_studentId) {
        Student storage s = students[_studentId];

        require(
            s.status == RequestStatus.None,
            "Recommendation already requested or approved"
        );

        s.status = RequestStatus.Requested;
        s.requestedAt = block.timestamp;

        emit RecommendationRequested(_studentId, msg.sender, block.timestamp);
    }

    /**
     * @notice Approves a pending recommendation request.
     * @param _studentId The unique student ID.
     */
    function approveRecommendation(uint256 _studentId) external onlyApprover studentExists(_studentId) {
        _executeApproval(_studentId, "");
    }

    /**
     * @notice Approves a pending recommendation with an attached IPFS document hash / CID (Bonus feature).
     * @param _studentId The unique student ID.
     * @param _ipfsHash The IPFS CID or document link of the LoR letter.
     */
    function approveRecommendationWithIpfs(
        uint256 _studentId,
        string memory _ipfsHash
    ) external onlyApprover studentExists(_studentId) {
        _executeApproval(_studentId, _ipfsHash);
    }

    /**
     * @dev Internal helper for approving a recommendation.
     */
    function _executeApproval(uint256 _studentId, string memory _ipfsHash) internal {
        Student storage s = students[_studentId];

        require(
            s.status == RequestStatus.Requested,
            "Recommendation must be in 'Requested' status to approve"
        );

        s.status = RequestStatus.Approved;
        s.approvedBy = msg.sender;
        s.ipfsHash = _ipfsHash;
        s.approvedAt = block.timestamp;

        emit RecommendationApproved(_studentId, msg.sender, _ipfsHash, block.timestamp);
    }

    /**
     * @notice Returns details for a specific student.
     * @param _studentId The unique student ID.
     */
    function getStudent(uint256 _studentId) external view studentExists(_studentId) returns (
        uint256 id,
        string memory name,
        string memory course,
        string memory email,
        address studentAddress,
        bool recommendationRequested,
        bool recommendationApproved,
        address approvedBy,
        string memory ipfsHash
    ) {
        Student storage s = students[_studentId];
        return (
            s.id,
            s.name,
            s.course,
            s.email,
            s.studentAddress,
            (s.status == RequestStatus.Requested || s.status == RequestStatus.Approved),
            (s.status == RequestStatus.Approved),
            s.approvedBy,
            s.ipfsHash
        );
    }

    /**
     * @notice Returns the full student struct.
     * @param _studentId The unique student ID.
     */
    function getStudentFull(uint256 _studentId) external view studentExists(_studentId) returns (Student memory) {
        return students[_studentId];
    }

    /**
     * @notice Helper to fetch all registered students for frontend listing.
     */
    function getAllStudents() external view returns (Student[] memory) {
        Student[] memory allStudents = new Student[](studentCount);
        for (uint256 i = 1; i <= studentCount; i++) {
            allStudents[i - 1] = students[i];
        }
        return allStudents;
    }
}
