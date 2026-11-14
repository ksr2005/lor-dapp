const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LetterOfRecommendation Smart Contract", function () {
  let LoR;
  let lor;
  let owner, approver1, approver2, studentWallet, otherUser;

  beforeEach(async function () {
    [owner, approver1, approver2, studentWallet, otherUser] = await ethers.getSigners();

    const LoRFactory = await ethers.getContractFactory("LetterOfRecommendation");
    lor = await LoRFactory.deploy();
    await lor.waitForDeployment();
  });

  describe("Deployment & Initial State", function () {
    it("should set the deployer as owner", async function () {
      expect(await lor.owner()).to.equal(owner.address);
    });

    it("should authorize the owner as an approver by default", async function () {
      expect(await lor.isApprover(owner.address)).to.be.true;
    });

    it("should initialize student count to 0", async function () {
      expect(await lor.studentCount()).to.equal(0n);
    });
  });

  describe("Approver Management (Owner Only)", function () {
    it("should allow the owner to authorize a new approver", async function () {
      await expect(lor.authorizeApprover(approver1.address))
        .to.emit(lor, "ApproverAuthorized")
        .withArgs(approver1.address);

      expect(await lor.isApprover(approver1.address)).to.be.true;
    });

    it("should revert if a non-owner tries to authorize an approver", async function () {
      await expect(
        lor.connect(otherUser).authorizeApprover(approver1.address)
      ).to.be.revertedWith("Only the contract owner can perform this action");
    });

    it("should revert if authorizing an already authorized approver", async function () {
      await lor.authorizeApprover(approver1.address);
      await expect(
        lor.authorizeApprover(approver1.address)
      ).to.be.revertedWith("Address is already an authorized approver");
    });

    it("should allow the owner to deauthorize an approver", async function () {
      await lor.authorizeApprover(approver1.address);
      expect(await lor.isApprover(approver1.address)).to.be.true;

      await expect(lor.deauthorizeApprover(approver1.address))
        .to.emit(lor, "ApproverDeauthorized")
        .withArgs(approver1.address);

      expect(await lor.isApprover(approver1.address)).to.be.false;
    });

    it("should revert if attempting to deauthorize the contract owner", async function () {
      await expect(
        lor.deauthorizeApprover(owner.address)
      ).to.be.revertedWith("Cannot deauthorize the contract owner");
    });

    it("should revert if a non-owner tries to deauthorize an approver", async function () {
      await lor.authorizeApprover(approver1.address);
      await expect(
        lor.connect(otherUser).deauthorizeApprover(approver1.address)
      ).to.be.revertedWith("Only the contract owner can perform this action");
    });
  });

  describe("Student Registration (addStudent)", function () {
    it("should successfully add a new student and emit StudentAdded event", async function () {
      const tx = await lor.connect(studentWallet).addStudent(
        "Alice Johnson",
        "Computer Science & Web3",
        "alice@example.com"
      );

      await expect(tx)
        .to.emit(lor, "StudentAdded")
        .withArgs(1n, "Alice Johnson", "Computer Science & Web3", "alice@example.com", studentWallet.address);

      expect(await lor.studentCount()).to.equal(1n);

      const student = await lor.getStudent(1n);
      expect(student.id).to.equal(1n);
      expect(student.name).to.equal("Alice Johnson");
      expect(student.course).to.equal("Computer Science & Web3");
      expect(student.email).to.equal("alice@example.com");
      expect(student.studentAddress).to.equal(studentWallet.address);
      expect(student.recommendationRequested).to.be.false;
      expect(student.recommendationApproved).to.be.false;
      expect(student.approvedBy).to.equal(ethers.ZeroAddress);
    });

    it("should revert if name, course, or email is empty", async function () {
      await expect(
        lor.addStudent("", "Computer Science", "alice@example.com")
      ).to.be.revertedWith("Student name cannot be empty");

      await expect(
        lor.addStudent("Alice", "", "alice@example.com")
      ).to.be.revertedWith("Student course cannot be empty");

      await expect(
        lor.addStudent("Alice", "Computer Science", "")
      ).to.be.revertedWith("Student email cannot be empty");
    });

    it("should correctly increment IDs for multiple students", async function () {
      await lor.addStudent("Student One", "CS", "s1@test.com");
      await lor.addStudent("Student Two", "ECE", "s2@test.com");
      expect(await lor.studentCount()).to.equal(2n);

      const s2 = await lor.getStudent(2n);
      expect(s2.name).to.equal("Student Two");
    });
  });

  describe("Requesting Recommendation (requestRecommendation)", function () {
    beforeEach(async function () {
      await lor.connect(studentWallet).addStudent("Alice", "CS", "alice@example.com");
    });

    it("should allow requesting a recommendation and emit RecommendationRequested event", async function () {
      await expect(lor.connect(studentWallet).requestRecommendation(1n))
        .to.emit(lor, "RecommendationRequested")
        .withArgs(1n, studentWallet.address, (val) => val > 0n);

      const student = await lor.getStudent(1n);
      expect(student.recommendationRequested).to.be.true;
      expect(student.recommendationApproved).to.be.false;
    });

    it("should revert if caller is not the registered student", async function () {
      await expect(
        lor.connect(otherUser).requestRecommendation(1n)
      ).to.be.revertedWith("Only the student can request a recommendation");
    });

    it("should revert if student ID does not exist", async function () {
      await expect(
        lor.connect(studentWallet).requestRecommendation(999n)
      ).to.be.revertedWith("Student ID does not exist");

      await expect(
        lor.connect(studentWallet).requestRecommendation(0n)
      ).to.be.revertedWith("Student ID does not exist");
    });

    it("should revert if recommendation is already requested", async function () {
      await lor.connect(studentWallet).requestRecommendation(1n);
      await expect(
        lor.connect(studentWallet).requestRecommendation(1n)
      ).to.be.revertedWith("Recommendation already requested or approved");
    });
  });

  describe("Approving Recommendation (approveRecommendation)", function () {
    beforeEach(async function () {
      await lor.connect(studentWallet).addStudent("Alice", "CS", "alice@example.com");
      await lor.authorizeApprover(approver1.address);
    });

    it("should revert approval if recommendation has not been requested", async function () {
      await expect(
        lor.connect(approver1).approveRecommendation(1n)
      ).to.be.revertedWith("Recommendation must be in 'Requested' status to approve");
    });

    it("should revert if non-approver attempts to approve", async function () {
      await lor.connect(studentWallet).requestRecommendation(1n);

      await expect(
        lor.connect(otherUser).approveRecommendation(1n)
      ).to.be.revertedWith("Only authorized approvers or owner can perform this action");
    });

    it("should allow an authorized approver to approve a requested recommendation", async function () {
      await lor.connect(studentWallet).requestRecommendation(1n);

      await expect(lor.connect(approver1).approveRecommendation(1n))
        .to.emit(lor, "RecommendationApproved")
        .withArgs(1n, approver1.address, "", (val) => val > 0n);

      const student = await lor.getStudent(1n);
      expect(student.recommendationRequested).to.be.true;
      expect(student.recommendationApproved).to.be.true;
      expect(student.approvedBy).to.equal(approver1.address);
    });

    it("should allow the contract owner to approve", async function () {
      await lor.connect(studentWallet).requestRecommendation(1n);

      await expect(lor.connect(owner).approveRecommendation(1n))
        .to.emit(lor, "RecommendationApproved")
        .withArgs(1n, owner.address, "", (val) => val > 0n);

      const student = await lor.getStudent(1n);
      expect(student.recommendationApproved).to.be.true;
      expect(student.approvedBy).to.equal(owner.address);
    });

    it("should support approving with IPFS CID / document link (Bonus)", async function () {
      await lor.connect(studentWallet).requestRecommendation(1n);
      const ipfsCid = "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

      await expect(lor.connect(approver1).approveRecommendationWithIpfs(1n, ipfsCid))
        .to.emit(lor, "RecommendationApproved")
        .withArgs(1n, approver1.address, ipfsCid, (val) => val > 0n);

      const student = await lor.getStudent(1n);
      expect(student.recommendationApproved).to.be.true;
      expect(student.approvedBy).to.equal(approver1.address);
      expect(student.ipfsHash).to.equal(ipfsCid);
    });

    it("should revert if attempting to approve an already approved recommendation", async function () {
      await lor.connect(studentWallet).requestRecommendation(1n);
      await lor.connect(approver1).approveRecommendation(1n);

      await expect(
        lor.connect(approver1).approveRecommendation(1n)
      ).to.be.revertedWith("Recommendation must be in 'Requested' status to approve");
    });
  });

  describe("View Functions & Helpers", function () {
    it("should return student details matching getStudent() signature", async function () {
      await lor.connect(studentWallet).addStudent("Alice", "CS", "alice@example.com");
      await lor.connect(studentWallet).requestRecommendation(1n);
      await lor.authorizeApprover(approver1.address);
      await lor.connect(approver1).approveRecommendationWithIpfs(1n, "ipfs://testCID");

      const student = await lor.getStudent(1n);
      expect(student.id).to.equal(1n);
      expect(student.name).to.equal("Alice");
      expect(student.course).to.equal("CS");
      expect(student.email).to.equal("alice@example.com");
      expect(student.studentAddress).to.equal(studentWallet.address);
      expect(student.recommendationRequested).to.be.true;
      expect(student.recommendationApproved).to.be.true;
      expect(student.approvedBy).to.equal(approver1.address);
      expect(student.ipfsHash).to.equal("ipfs://testCID");
    });

    it("should return all students correctly using getAllStudents()", async function () {
      await lor.addStudent("Student A", "Math", "a@test.com");
      await lor.addStudent("Student B", "Physics", "b@test.com");

      const all = await lor.getAllStudents();
      expect(all.length).to.equal(2);
      expect(all[0].name).to.equal("Student A");
      expect(all[1].name).to.equal("Student B");
    });

    it("should return full struct via getStudentFull()", async function () {
      await lor.addStudent("Student Full", "CS", "full@test.com");
      const full = await lor.getStudentFull(1n);
      expect(full.id).to.equal(1n);
      expect(full.name).to.equal("Student Full");
      expect(full.course).to.equal("CS");
    });
  });
});

