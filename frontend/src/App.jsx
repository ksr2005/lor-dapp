import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  GraduationCap,
  Wallet,
  UserPlus,
  Send,
  CheckCircle2,
  Users,
  ShieldCheck,
  Search,
  ExternalLink,
  Award,
  AlertCircle,
  FileText,
  KeyRound,
  RefreshCw,
  X
} from 'lucide-react';

// Import compiled artifact and deployment info
import LoRArtifact from './contracts/LetterOfRecommendation.json';
import defaultDeployment from './contracts/deployedAddress.json';

const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111
const HARDHAT_CHAIN_ID = '0x7a69';   // 31337

export default function App() {
  // Wallet & Web3 state
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [chainId, setChainId] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [contractAddress, setContractAddress] = useState(defaultDeployment.contractAddress || '');
  const [isOwner, setIsOwner] = useState(false);
  const [isApprover, setIsApprover] = useState(false);

  // App UI state
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'lookup' | 'add' | 'request' | 'approve' | 'admin'
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '', txHash: '' });
  const [selectedStudentForCert, setSelectedStudentForCert] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form states
  const [addForm, setAddForm] = useState({ name: '', course: '', email: '' });
  const [requestId, setRequestId] = useState('');
  const [approveForm, setApproveForm] = useState({ studentId: '', ipfsHash: '' });
  const [adminForm, setAdminForm] = useState({ approverAddress: '', deauthorizeAddress: '' });

  // Lookup state for getStudent()
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Initialize Ethers and Contract
  const initContract = useCallback(async (signerOrProvider, addr) => {
    if (!addr || !ethers.isAddress(addr)) return null;
    try {
      const c = new ethers.Contract(addr, LoRArtifact.abi, signerOrProvider);
      return c;
    } catch (err) {
      console.error('Failed to initialize contract:', err);
      return null;
    }
  }, []);

  // Connect MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatusMessage({
        type: 'error',
        text: 'MetaMask is not installed. Please install MetaMask to use this DApp.',
      });
      return;
    }

    try {
      setLoading(true);
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const userSigner = await browserProvider.getSigner();
      const network = await browserProvider.getNetwork();
      const userBalance = await browserProvider.getBalance(accounts[0]);

      setProvider(browserProvider);
      setSigner(userSigner);
      setAccount(accounts[0]);
      setChainId('0x' + network.chainId.toString(16));
      setBalance(parseFloat(ethers.formatEther(userBalance)).toFixed(4));

      const instance = await initContract(userSigner, contractAddress);
      setContract(instance);

      setStatusMessage({
        type: 'success',
        text: `Connected successfully: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
    } catch (err) {
      console.error('Connection error:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to connect wallet.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Switch to Sepolia Testnet
  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
                rpcUrls: ['https://rpc.sepolia.org', 'https://ethereum-sepolia-rpc.publicnode.com'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
        }
      }
    }
  };

  // Refresh user permissions and load student list
  const refreshData = useCallback(async () => {
    if (!contract || !account) return;
    try {
      // Check Owner & Approver status
      const ownerAddress = await contract.owner();
      const isUserOwner = ownerAddress.toLowerCase() === account.toLowerCase();
      setIsOwner(isUserOwner);

      const isUserApprover = await contract.isApprover(account);
      setIsApprover(isUserApprover || isUserOwner);

      // Fetch all students
      const rawStudents = await contract.getAllStudents();
      const formatted = rawStudents.map((s) => ({
        id: Number(s.id),
        name: s.name,
        course: s.course,
        email: s.email,
        studentAddress: s.studentAddress,
        status: Number(s.status), // 0: None, 1: Requested, 2: Approved
        approvedBy: s.approvedBy,
        ipfsHash: s.ipfsHash,
        requestedAt: Number(s.requestedAt),
        approvedAt: Number(s.approvedAt),
      }));
      setStudents(formatted);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  }, [contract, account]);

  useEffect(() => {
    if (contract && account) {
      refreshData();
    } else if (!contract && contractAddress && defaultDeployment.network === 'sepolia') {
      // Fallback read-only provider to display on-chain Sepolia data immediately
      const readOnlyProvider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
      const readContract = new ethers.Contract(contractAddress, LoRArtifact.abi, readOnlyProvider);
      readContract.getAllStudents().then((raw) => {
        const formatted = raw.map((s) => ({
          id: Number(s.id),
          name: s.name,
          course: s.course,
          email: s.email,
          studentAddress: s.studentAddress,
          status: Number(s.status),
          approvedBy: s.approvedBy,
          ipfsHash: s.ipfsHash,
          requestedAt: Number(s.requestedAt),
          approvedAt: Number(s.approvedAt),
        }));
        setStudents(formatted);
      }).catch((e) => console.log('Read-only fetch notice:', e.message));
    }
  }, [contract, account, contractAddress, refreshData]);

  // Listen to MetaMask account / network events
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet();
        } else {
          setAccount('');
          setContract(null);
        }
      });

      window.ethereum.on('chainChanged', (newChainId) => {
        setChainId(newChainId);
        window.location.reload();
      });
    }
  }, []);

  // Action: Add Student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!contract) return;
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'Submitting student registration to the blockchain...' });

      const tx = await contract.addStudent(addForm.name, addForm.course, addForm.email);
      setStatusMessage({
        type: 'info',
        text: 'Transaction sent! Waiting for block confirmation...',
        txHash: tx.hash,
      });

      const receipt = await tx.wait();
      setStatusMessage({
        type: 'success',
        text: `Student "${addForm.name}" registered successfully! Block: ${receipt.blockNumber}`,
        txHash: tx.hash,
      });
      setAddForm({ name: '', course: '', email: '' });
      await refreshData();
      setActiveTab('students');
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err?.reason || err?.message || 'Transaction failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Action: Request Recommendation
  const handleRequestRecommendation = async (idToRequest) => {
    const studentId = idToRequest || requestId;
    if (!contract || !studentId) return;
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: `Requesting recommendation for Student ID #${studentId}...` });

      const tx = await contract.requestRecommendation(studentId);
      setStatusMessage({
        type: 'info',
        text: 'Request submitted! Awaiting blockchain confirmation...',
        txHash: tx.hash,
      });

      await tx.wait();
      setStatusMessage({
        type: 'success',
        text: `Recommendation request for Student #${studentId} submitted successfully!`,
        txHash: tx.hash,
      });
      setRequestId('');
      await refreshData();
      setActiveTab('students');
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err?.reason || err?.message || 'Recommendation request failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Action: Approve Recommendation
  const handleApproveRecommendation = async (e) => {
    if (e) e.preventDefault();
    const id = approveForm.studentId;
    if (!contract || !id) return;
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: `Approving recommendation for Student ID #${id}...` });

      const ipfsValue = approveForm.ipfsHash.trim();

      let tx;
      if (ipfsValue) {
        tx = await contract.approveRecommendationWithIpfs(id, ipfsValue);
      } else {
        tx = await contract.approveRecommendation(id);
      }

      setStatusMessage({
        type: 'info',
        text: 'Approval transaction broadcast! Waiting for confirmation...',
        txHash: tx.hash,
      });

      await tx.wait();
      setStatusMessage({
        type: 'success',
        text: `Recommendation for Student #${id} successfully approved on-chain!`,
        txHash: tx.hash,
      });
      setApproveForm({ studentId: '', ipfsHash: '' });
      await refreshData();
      setActiveTab('students');
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err?.reason || err?.message || 'Approval failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Action: Direct call to contract.getStudent(id)
  const handleLookupStudent = async (idToLook) => {
    const id = idToLook !== undefined ? idToLook : lookupId;
    if (!contract || !id) return;
    try {
      setLookupLoading(true);
      const res = await contract.getStudent(id);
      setLookupResult({
        id: Number(res.id),
        name: res.name,
        course: res.course,
        email: res.email,
        studentAddress: res.studentAddress,
        recommendationRequested: res.recommendationRequested,
        recommendationApproved: res.recommendationApproved,
        approvedBy: res.approvedBy,
        ipfsHash: res.ipfsHash,
      });
      setStatusMessage({
        type: 'success',
        text: `Successfully fetched Student #${id} using contract.getStudent()`,
      });
    } catch (err) {
      console.error(err);
      setLookupResult(null);
      setStatusMessage({
        type: 'error',
        text: err?.reason || err?.message || `Failed to fetch details for Student #${id}`,
      });
    } finally {
      setLookupLoading(false);
    }
  };

  // Action: Authorize Approver (Owner only)
  const handleAuthorizeApprover = async (e) => {
    e.preventDefault();
    if (!contract || !adminForm.approverAddress) return;
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'Authorizing faculty approver...' });
      const tx = await contract.authorizeApprover(adminForm.approverAddress);
      await tx.wait();
      setStatusMessage({
        type: 'success',
        text: `Address ${adminForm.approverAddress} authorized successfully as an approver!`,
        txHash: tx.hash,
      });
      setAdminForm({ ...adminForm, approverAddress: '' });
      await refreshData();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err?.reason || err?.message || 'Authorization failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Action: Deauthorize Approver (Owner only)
  const handleDeauthorizeApprover = async (e) => {
    e.preventDefault();
    if (!contract || !adminForm.deauthorizeAddress) return;
    try {
      setLoading(true);
      setStatusMessage({ type: 'info', text: 'Deauthorizing faculty approver...' });
      const tx = await contract.deauthorizeApprover(adminForm.deauthorizeAddress);
      await tx.wait();
      setStatusMessage({
        type: 'success',
        text: `Address ${adminForm.deauthorizeAddress} deauthorized successfully.`,
        txHash: tx.hash,
      });
      setAdminForm({ ...adminForm, deauthorizeAddress: '' });
      await refreshData();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err?.reason || err?.message || 'Deauthorization failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search and status
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toString() === searchQuery;

    if (filterStatus === 'pending') return matchesSearch && s.status === 1;
    if (filterStatus === 'approved') return matchesSearch && s.status === 2;
    if (filterStatus === 'unrequested') return matchesSearch && s.status === 0;
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    if (status === 2) {
      return <span className="badge badge-success"><CheckCircle2 size={13} /> Approved</span>;
    }
    if (status === 1) {
      return <span className="badge badge-warning"><Clock size={13} /> Pending Review</span>;
    }
    return <span className="badge badge-neutral">Not Requested</span>;
  };

  // Only return external Etherscan link if on Sepolia Testnet
  const getExplorerTxUrl = (txHash) => {
    if (chainId === SEPOLIA_CHAIN_ID) {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
    return null;
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <GraduationCap size={26} />
          </div>
          <div className="logo-text">
            <h1>Letter of Recommendation DApp</h1>
            <p>Decentralized LoR Verification on Ethereum & Sepolia</p>
          </div>
        </div>

        <div className="wallet-section">
          {chainId && (
            <div className="network-badge">
              <span className={`network-dot ${chainId !== SEPOLIA_CHAIN_ID && chainId !== HARDHAT_CHAIN_ID ? 'unsupported' : ''}`}></span>
              <span>
                {chainId === SEPOLIA_CHAIN_ID
                  ? 'Sepolia Testnet'
                  : chainId === HARDHAT_CHAIN_ID
                  ? 'Hardhat Localhost'
                  : 'Unsupported Network'}
              </span>
            </div>
          )}

          {account ? (
            <div className="account-pill mono">
              <Wallet size={15} />
              <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
              <span style={{ opacity: 0.7 }}>({balance} ETH)</span>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={connectWallet} disabled={loading}>
              <Wallet size={16} />
              Connect MetaMask
            </button>
          )}

          {chainId && chainId !== SEPOLIA_CHAIN_ID && chainId !== HARDHAT_CHAIN_ID && (
            <button className="btn btn-secondary btn-sm" onClick={switchToSepolia}>
              Switch to Sepolia
            </button>
          )}
        </div>
      </header>

      {/* Contract & Role Info Banner */}
      <div className="info-banner">
        <div className="banner-item mono">
          <FileText size={16} />
          <span>Contract:</span>
          <span style={{ color: '#fff' }}>{contractAddress ? `${contractAddress.slice(0, 8)}...${contractAddress.slice(-6)}` : 'Not set'}</span>
          {chainId === SEPOLIA_CHAIN_ID && contractAddress && (
            <a
              href={`https://sepolia.etherscan.io/address/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#38bdf8', marginLeft: '4px' }}
              title="View on Sepolia Etherscan"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isOwner && (
            <span className="badge badge-warning">
              <ShieldCheck size={12} /> Contract Owner
            </span>
          )}
          {isApprover && !isOwner && (
            <span className="badge badge-success">
              <Award size={12} /> Faculty Approver
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={refreshData} title="Refresh on-chain data">
            <RefreshCw size={13} className={loading ? 'spinner' : ''} />
            Sync
          </button>
        </div>
      </div>

      {/* Notification / Status Message */}
      {statusMessage.text && (
        <div className={`alert ${statusMessage.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p>{statusMessage.text}</p>
            {statusMessage.txHash && (
              <p style={{ marginTop: '0.25rem' }}>
                {getExplorerTxUrl(statusMessage.txHash) ? (
                  <a
                    href={getExplorerTxUrl(statusMessage.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'inherit', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    View on Sepolia Etherscan: {statusMessage.txHash.slice(0, 10)}... <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="mono" style={{ fontSize: '0.82rem', opacity: 0.85 }}>
                    Tx Hash: {statusMessage.txHash}
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={() => setStatusMessage({ type: '', text: '', txHash: '' })}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <Users size={16} />
          All Students ({students.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'lookup' ? 'active' : ''}`}
          onClick={() => setActiveTab('lookup')}
        >
          <Search size={16} />
          Lookup Student (getStudent)
        </button>
        <button
          className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <UserPlus size={16} />
          Add Student
        </button>
        <button
          className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          <Send size={16} />
          Request LoR
        </button>
        <button
          className={`tab-btn ${activeTab === 'approve' ? 'active' : ''}`}
          onClick={() => setActiveTab('approve')}
        >
          <Award size={16} />
          Approve LoR {isApprover ? '(Faculty Mode)' : ''}
        </button>
        {isOwner && (
          <button
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <KeyRound size={16} />
            Approver Management
          </button>
        )}
      </nav>

      {/* TAB 1: ALL STUDENTS LIST & DIRECTORY */}
      {activeTab === 'students' && (
        <section className="card">
          <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 className="card-title">Registered Students & Recommendations</h2>
              <p className="card-desc" style={{ marginBottom: 0 }}>
                Explore registered students, check LoR status, or look up details on-chain.
              </p>
            </div>

            {/* Filter and Search */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search student, course, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '32px', width: '230px', fontSize: '0.82rem' }}
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select"
                style={{ width: '150px', fontSize: '0.82rem' }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved LoRs</option>
                <option value="unrequested">Not Requested</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="lor-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student Name</th>
                  <th>Course / Dept</th>
                  <th>Email</th>
                  <th>Student Address</th>
                  <th>LoR Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No students found. Click "Add Student" to register a new record.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td className="mono" style={{ fontWeight: 600, color: '#38bdf8' }}>#{s.id}</td>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.course}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {s.studentAddress ? `${s.studentAddress.slice(0, 6)}...${s.studentAddress.slice(-4)}` : 'N/A'}
                      </td>
                      <td>{getStatusBadge(s.status)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setLookupId(s.id.toString());
                              handleLookupStudent(s.id);
                              setActiveTab('lookup');
                            }}
                            title="Query getStudent() on-chain"
                          >
                            <Search size={12} /> Details
                          </button>
                          {s.status === 0 && account.toLowerCase() === s.studentAddress.toLowerCase() && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleRequestRecommendation(s.id)}
                              disabled={loading}
                              title="Request Recommendation"
                            >
                              <Send size={12} /> Request
                            </button>
                          )}
                          {s.status === 1 && isApprover && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                setApproveForm({ ...approveForm, studentId: s.id.toString() });
                                setActiveTab('approve');
                              }}
                              disabled={loading}
                              title="Approve Recommendation"
                            >
                              <Award size={12} /> Approve
                            </button>
                          )}
                          {s.status === 2 && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedStudentForCert(s)}
                              title="View Verified Certificate"
                            >
                              <FileText size={12} /> Certificate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: LOOKUP STUDENT (CALLS getStudent directly) */}
      {activeTab === 'lookup' && (
        <section className="card" style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h2 className="card-title">
            <Search size={22} color="var(--primary)" />
            Query Student Details (`getStudent`)
          </h2>
          <p className="card-desc">
            Calls the smart contract's <code>getStudent(uint studentId)</code> view function directly and displays the on-chain return values.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              type="number"
              min="1"
              placeholder="Enter Student ID (e.g. 1)"
              className="form-input mono"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleLookupStudent()}
              disabled={lookupLoading || !lookupId || !contract}
            >
              {lookupLoading ? <div className="spinner" /> : <Search size={16} />}
              Fetch
            </button>
          </div>

          {lookupResult && (
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#38bdf8' }}>
                On-Chain Record: #{lookupResult.id} - {lookupResult.name}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Course: </span>
                  <strong>{lookupResult.course}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                  <strong>{lookupResult.email}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Student Address: </span>
                  <span className="mono" style={{ color: '#cbd5e1' }}>{lookupResult.studentAddress}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Recommendation Requested: </span>
                  <span style={{ color: lookupResult.recommendationRequested ? '#34d399' : '#94a3b8' }}>
                    {lookupResult.recommendationRequested ? 'true' : 'false'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Recommendation Approved: </span>
                  <span style={{ color: lookupResult.recommendationApproved ? '#34d399' : '#94a3b8' }}>
                    {lookupResult.recommendationApproved ? 'true' : 'false'}
                  </span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Approved By: </span>
                  <span className="mono" style={{ color: lookupResult.approvedBy === ethers.ZeroAddress ? '#64748b' : '#34d399' }}>
                    {lookupResult.approvedBy === ethers.ZeroAddress ? 'Not approved yet (0x0)' : lookupResult.approvedBy}
                  </span>
                </div>
                {lookupResult.ipfsHash && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Attached IPFS CID: </span>
                    <span className="mono" style={{ color: '#38bdf8', wordBreak: 'break-all' }}>{lookupResult.ipfsHash}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: ADD STUDENT */}
      {activeTab === 'add' && (
        <section className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 className="card-title">
            <UserPlus size={22} color="var(--primary)" />
            Add New Student
          </h2>
          <p className="card-desc">
            Register student information onto the smart contract to enable LoR requests and verification.
          </p>

          <form onSubmit={handleAddStudent}>
            <div className="form-group">
              <label className="form-label">Student Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Alice Johnson"
                className="form-input"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Course / Specialization</label>
              <input
                type="text"
                required
                placeholder="e.g. Computer Science & Web3"
                className="form-input"
                value={addForm.course}
                onChange={(e) => setAddForm({ ...addForm, course: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Student Email</label>
              <input
                type="email"
                required
                placeholder="e.g. alice@university.edu"
                className="form-input"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading || !account}
            >
              {loading ? <div className="spinner" /> : <UserPlus size={16} />}
              Register Student On-Chain
            </button>
          </form>
        </section>
      )}

      {/* TAB 4: REQUEST RECOMMENDATION */}
      {activeTab === 'request' && (
        <section className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 className="card-title">
            <Send size={22} color="var(--primary)" />
            Request Letter of Recommendation
          </h2>
          <p className="card-desc">
            Submit a recommendation request for your registered student record. Must be submitted by the wallet that registered the student.
          </p>

          <div className="form-group">
            <label className="form-label">Select Registered Student</label>
            <select
              className="form-select"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
            >
              <option value="">-- Choose student --</option>
              {students
                .filter((s) => s.status === 0)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} - {s.name} ({s.course})
                  </option>
                ))}
            </select>
          </div>

          <div style={{ textAlign: 'center', margin: '0.75rem 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            — or enter ID manually —
          </div>

          <div className="form-group">
            <label className="form-label">Student ID</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 1"
              className="form-input mono"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={() => handleRequestRecommendation()}
            disabled={loading || !requestId || !account}
          >
            {loading ? <div className="spinner" /> : <Send size={16} />}
            Submit LoR Request
          </button>
        </section>
      )}

      {/* TAB 5: APPROVE RECOMMENDATION */}
      {activeTab === 'approve' && (
        <section className="card" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h2 className="card-title">
            <Award size={22} color="var(--accent-cyan)" />
            Approve Letter of Recommendation
          </h2>
          <p className="card-desc">
            Faculty approvers and the contract owner can review pending requests and approve recommendations.
          </p>

          {!isApprover && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>
                Your connected wallet ({account.slice(0, 6)}...{account.slice(-4)}) is not an authorized approver. Only authorized faculty or the contract owner can approve recommendations.
              </span>
            </div>
          )}

          <form onSubmit={handleApproveRecommendation}>
            <div className="form-group">
              <label className="form-label">Select Pending Student Request</label>
              <select
                className="form-select"
                value={approveForm.studentId}
                onChange={(e) => setApproveForm({ ...approveForm, studentId: e.target.value })}
              >
                <option value="">-- Choose pending student --</option>
                {students
                  .filter((s) => s.status === 1)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} - {s.name} ({s.course})
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Student ID</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 1"
                className="form-input mono"
                value={approveForm.studentId}
                onChange={(e) => setApproveForm({ ...approveForm, studentId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">IPFS CID / Document Hash (Optional Bonus)</label>
              <input
                type="text"
                placeholder="e.g. QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco or ipfs://Qm..."
                className="form-input mono"
                value={approveForm.ipfsHash}
                onChange={(e) => setApproveForm({ ...approveForm, ipfsHash: e.target.value })}
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Optionally paste an IPFS CID if the recommendation document has been uploaded to IPFS. Leave blank for standard on-chain approval.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-success"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading || !approveForm.studentId || !isApprover || !account}
            >
              {loading ? <div className="spinner" /> : <Award size={16} />}
              Approve LoR On-Chain
            </button>
          </form>
        </section>
      )}

      {/* TAB 6: ADMIN & APPROVER MANAGEMENT (OWNER ONLY) */}
      {activeTab === 'admin' && isOwner && (
        <section className="card" style={{ maxWidth: '650px', margin: '0 auto' }}>
          <h2 className="card-title">
            <KeyRound size={22} color="var(--warning)" />
            Approver Access Control (Owner Dashboard)
          </h2>
          <p className="card-desc">
            Authorize new faculty reviewers or deauthorize existing approvers on the smart contract.
          </p>

          <form onSubmit={handleAuthorizeApprover} style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#c7d2fe', marginBottom: '0.75rem' }}>Authorize New Faculty Approver</h3>
            <div className="form-group">
              <label className="form-label">Ethereum Wallet Address</label>
              <input
                type="text"
                required
                placeholder="0x..."
                className="form-input mono"
                value={adminForm.approverAddress}
                onChange={(e) => setAdminForm({ ...adminForm, approverAddress: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !account}>
              Authorize Approver
            </button>
          </form>

          <form onSubmit={handleDeauthorizeApprover}>
            <h3 style={{ fontSize: '1rem', color: '#f87171', marginBottom: '0.75rem' }}>Deauthorize Approver</h3>
            <div className="form-group">
              <label className="form-label">Ethereum Wallet Address</label>
              <input
                type="text"
                required
                placeholder="0x..."
                className="form-input mono"
                value={adminForm.deauthorizeAddress}
                onChange={(e) => setAdminForm({ ...adminForm, deauthorizeAddress: e.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-danger" disabled={loading || !account}>
              Deauthorize Approver
            </button>
          </form>
        </section>
      )}

      {/* MODAL: VERIFIED LOR CERTIFICATE */}
      {selectedStudentForCert && (
        <div className="modal-overlay" onClick={() => setSelectedStudentForCert(null)}>
          <div className="certificate-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedStudentForCert(null)}>
              <X size={18} />
            </button>

            <div className="cert-header">
              <GraduationCap size={48} color="#38bdf8" style={{ marginBottom: '0.75rem' }} />
              <h2>Letter of Recommendation</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
                ON-CHAIN CRYPTOGRAPHIC CREDENTIAL
              </p>
            </div>

            <div className="cert-body">
              <p style={{ marginBottom: '1rem' }}>
                This is an official decentralized Letter of Recommendation verifying that:
              </p>
              <p className="cert-student-name" style={{ textAlign: 'center', margin: '1.25rem 0' }}>
                {selectedStudentForCert.name}
              </p>
              <p style={{ textAlign: 'center', color: '#93c5fd', marginBottom: '1.5rem' }}>
                Department / Program: <strong>{selectedStudentForCert.course}</strong>
              </p>
              <p>
                has demonstrated commendable proficiency, integrity, and dedication. This recommendation is permanently recorded on the Ethereum blockchain and digitally signed by an authorized university approver.
              </p>

              {selectedStudentForCert.ipfsHash && (
                <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>IPFS / DOCUMENT REFERENCE:</span>
                  <p className="mono" style={{ fontSize: '0.82rem', wordBreak: 'break-all', marginTop: '0.25rem' }}>
                    {selectedStudentForCert.ipfsHash}
                  </p>
                </div>
              )}
            </div>

            <div className="cert-footer mono">
              <div>
                <p style={{ color: 'var(--text-muted)' }}>Student ID: #{selectedStudentForCert.id}</p>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                  Student Wallet: {selectedStudentForCert.studentAddress ? `${selectedStudentForCert.studentAddress.slice(0, 10)}...` : 'N/A'}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ color: '#34d399', fontWeight: 600 }}>✓ Verified By Authorized Faculty</p>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                  Signer: {selectedStudentForCert.approvedBy ? `${selectedStudentForCert.approvedBy.slice(0, 10)}...${selectedStudentForCert.approvedBy.slice(-6)}` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Clock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}
