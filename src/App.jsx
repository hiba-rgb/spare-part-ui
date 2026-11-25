import React, { useState, useEffect } from 'react';
import { Lock, Upload, CheckCircle, XCircle, RefreshCw, AlertCircle, Send, Info, Eye, EyeOff } from 'lucide-react';

// Uses EC2 port 8000 on localhost and HTTPS nip.io domain when hosted on AWS Amplify
const API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://13.232.137.93:8000'
    : '';

// Fallback master parts catalog (synced with DynamoDB)
const INITIAL_MASTER_CATALOG = [
  { code: "R107051076", name: "POWER TERMINAL BOOT COVER" },
  { code: "R10108125", name: "FRONT COVER MOUNT BRACKET" },
  { code: "FLG-882-B", name: "FLANGE ASSEMBLY TYPE B" },
  { code: "FLG-882-C", name: "FLANGE ASSEMBLY TYPE C" },
  { code: "VLV-400-A", name: "PRIMARY VALVE HOUSING 4-INCH" },
  { code: "GSK-104-D", name: "SEALING GASKET HIGH-TEMP" },
  { code: "BRK-771-X", name: "CALIPER MOUNTING PLATE" }
];

export default function App() {
  // Login & User Session States
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // App & Search States (Stateless Single File Only)
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // DynamoDB Master Catalog & Dropdown States
  const [masterCatalog, setMasterCatalog] = useState(INITIAL_MASTER_CATALOG);
  const [selectedCorrectionCode, setSelectedCorrectionCode] = useState('');
  const [selectedManualCode, setSelectedManualCode] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isIncorrectMarked, setIsIncorrectMarked] = useState(false);

  // Fetch Master Catalog from DynamoDB via EC2 Backend
  useEffect(() => {
    const fetchMasterCatalog = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/parts`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.parts && data.parts.length > 0) {
            setMasterCatalog(data.parts);
          }
        }
      } catch (err) {
        console.warn("Using local master catalog fallback:", err.message);
      }
    };
    fetchMasterCatalog();
  }, []);

  // --- HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) return;

    setAuthLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginId.trim(),
          password: password.trim()
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.detail || `Authentication failed (HTTP ${response.status}).`);
        return;
      }

      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setShowPassword(false);
      setError('');
    } catch (err) {
      setError(`Cannot reach authentication server (${API_BASE_URL}). Please check network connectivity.`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setPassword('');
    setShowPassword(false);
    handleResetSearch();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSearch = async () => {
    if (!selectedFile) return setError('Please select a photo of a single spare part.');
    setLoading(true);
    setError('');
    setResult(null);
    setFeedbackSent(false);
    setIsIncorrectMarked(false);
    setSelectedCorrectionCode('');
    setSelectedManualCode('');

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/search`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || `Server responded with HTTP ${response.status}`);
      }

      console.log("Raw AI Data:", data);

      if (data.status === "success" && data.matches && data.matches.length > 0) {
        const bestMatch = data.matches[0];
        const confidence =
          typeof bestMatch.confidence === 'number'
            ? parseFloat(bestMatch.confidence.toFixed(1))
            : parseFloat(Math.max(0, 100 - (bestMatch.similarity_score || 0)).toFixed(1));

        if (confidence < 50) {
          setResult({ isMatch: false });
          return;
        }

        setResult({
          isMatch: true,
          productCode: bestMatch.part_code || `Row ID: ${bestMatch.faiss_row_id}`,
          productName: bestMatch.part_name || "Unknown Part",
          status: bestMatch.status || "Unknown",
          genEligibility: bestMatch.gen_models || "Unknown",
          confidence: confidence,
          reason: bestMatch.reason || "",
          matchImageUrl: bestMatch.match_image_url
        });
      } else {
        setResult({ isMatch: false });
      }
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError(`Cannot reach search backend (${API_BASE_URL}). Verify EC2 service is running.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (isCorrect) => {
    if (isCorrect) {
      setFeedbackSent(true);
    } else {
      setIsIncorrectMarked(true);
    }
  };

  const handleCorrectionSubmit = (e) => {
    e.preventDefault();
    const isValid = masterCatalog.some(part => part.code === selectedCorrectionCode.trim().toUpperCase());
    if (!isValid) {
      alert("Please select a valid product code from the database list.");
      return;
    }
    setFeedbackSent(true);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const isValid = masterCatalog.some(part => part.code === selectedManualCode.trim().toUpperCase());
    if (!isValid) {
      alert("Please select a valid product code from the database list.");
      return;
    }
    setFeedbackSent(true);
  };

  const handleResetSearch = () => {
    setResult(null);
    setSelectedFile(null);
    setPreview(null);
    setFeedbackSent(false);
    setIsIncorrectMarked(false);
    setSelectedCorrectionCode('');
    setSelectedManualCode('');
    setError('');
  };

  // --- BRAND HEADER COMPONENT ---
  const BrandHeader = ({ showLogout = true }) => (
    <div style={styles.brandHeader}>
      <div style={styles.brandTitleRow}>
        <img
          src="/KL11-20211110-River-Wordmark-RiverBlue.png"
          alt="River"
          style={styles.logoImage}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline-block';
          }}
        />
        <span style={styles.logoFallbackText}>River</span>
        <div style={styles.verticalDivider} />
        <h1 style={styles.headerTitle}>Smart Spares Identifier</h1>
      </div>
      {showLogout && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentUser?.location && (
            <span style={styles.userBadge}>{currentUser.location}</span>
          )}
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      )}
    </div>
  );

  // --- UI: LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <BrandHeader showLogout={false} />

          <div style={styles.loginIntro}>
            <Lock size={36} color="#007db6" style={{ marginBottom: 8 }} />
            <h2 style={styles.subHeading}>Restricted Access</h2>
            <p style={styles.bodyMuted}>Sign in with your authorized River service email and password.</p>
          </div>

          <form onSubmit={handleLogin} style={styles.leftAlignedForm}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Company Email</label>
              <input
                type="email"
                placeholder="name@rideriver.com"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...styles.input, paddingRight: 42 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeToggleBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={authLoading} style={styles.primaryButton}>
              {authLoading ? <RefreshCw className="spin" size={18} /> : 'Login'}
            </button>
          </form>

          {error && <p style={styles.errorText}>{error}</p>}
        </div>
      </div>
    );
  }

  // --- UI: MAIN SEARCH DASHBOARD ---
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <BrandHeader showLogout={true} />

        {!result && (
          <>
            <div style={styles.instructionBanner}>
              <Info size={20} color="#007db6" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={styles.instructionText}>
                <strong>Identification Guidelines:</strong>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: 18 }}>
                  <li>Photograph a <strong>single, detached spare part</strong> only (do not photograph assemblies or connected components).</li>
                  <li>Place the part on a <strong>clean, plain background</strong> with balanced lighting.</li>
                  <li>Submit <strong>only one image</strong> at a time for search.</li>
                </ul>
              </div>
            </div>

            {!selectedFile ? (
              <div style={styles.uploadBox}>
                <Upload size={36} color="#007db6" />
                <p style={{ margin: '10px 0 4px 0', fontWeight: 'bold', color: '#00405d', fontSize: 15 }}>
                  Upload Spare Part Photo
                </p>
                <p style={{ margin: '0 0 14px 0', fontSize: 13, color: '#5e5e5e' }}>
                  PNG or JPEG (max 1 file)
                </p>
                <label style={styles.fileSelectButton}>
                  Choose File
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            ) : (
              <div style={styles.activePreviewBox}>
                <img src={preview} alt="Selected Part" style={styles.mainPreviewImage} />
                <div style={styles.previewMeta}>
                  <span style={styles.fileNameText}>{selectedFile.name}</span>
                  <label style={styles.changeFileButton}>
                    Choose another file
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            )}

            {error && <p style={styles.errorText}>{error}</p>}

            <button
              onClick={handleSearch}
              disabled={loading || !selectedFile}
              style={{ ...styles.primaryButton, marginTop: 16 }}
            >
              {loading ? <RefreshCw className="spin" size={20} /> : 'Search Database'}
            </button>
          </>
        )}

        {/* --- UI: RESULTS SECTION --- */}
        {result && (
          <div>
            {result.isMatch ? (
              <div style={styles.successBox}>
                <h3 style={styles.successTitle}>
                  <CheckCircle size={20} color="#16a34a" /> Match Found
                </h3>

                <div style={styles.resultImageContainer}>
                  {preview && (
                    <div>
                      <span style={styles.thumbCaption}>Uploaded Photo</span>
                      <img src={preview} alt="Uploaded Part" style={styles.resultThumb} />
                    </div>
                  )}
                  {result.matchImageUrl && (
                    <div>
                      <span style={styles.thumbCaption}>Matched CAD</span>
                      <img src={result.matchImageUrl} alt="Matched CAD" style={styles.resultThumb} />
                    </div>
                  )}
                </div>

                <div style={styles.gridData}>
                  <div><span style={styles.dataLabel}>Product Code</span><br/><strong>{result.productCode}</strong></div>
                  <div><span style={styles.dataLabel}>Product Name</span><br/><strong>{result.productName}</strong></div>
                  <div>
                    <span style={styles.dataLabel}>Status</span><br/>
                    <span style={{ color: result.status === 'Serviceable' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                      {result.status}
                    </span>
                  </div>
                  <div><span style={styles.dataLabel}>Gen Eligibility</span><br/><strong>{result.genEligibility}</strong></div>
                  <div><span style={styles.dataLabel}>AI Confidence</span><br/><strong>{result.confidence}%</strong></div>
                </div>

                {result.reason && (
                  <p style={styles.reasonText}>
                    <strong>Geometric Match Note:</strong> {result.reason}
                  </p>
                )}

                <hr style={styles.divider} />

                {!feedbackSent ? (
                  !isIncorrectMarked ? (
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', color: '#00405d' }}>Is this the correct part?</p>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => handleFeedback(true)} style={styles.yesBtn}><CheckCircle size={18} /> Yes</button>
                        <button onClick={() => handleFeedback(false)} style={styles.noBtn}><XCircle size={18} /> No</button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCorrectionSubmit} style={{ textAlign: 'left' }}>
                      <p style={styles.dropdownPrompt}>
                        Tell us about the product code so that we can save it:
                      </p>
                      <div style={styles.selectWrapper}>
                        <input
                          list="correction-catalog-list"
                          value={selectedCorrectionCode}
                          onChange={(e) => setSelectedCorrectionCode(e.target.value)}
                          placeholder="Type or select a valid product code..."
                          style={styles.dropdownSelect}
                          required
                        />
                        <datalist id="correction-catalog-list">
                          {masterCatalog.map((part) => (
                            <option key={part.code} value={part.code}>
                              {part.name}
                            </option>
                          ))}
                        </datalist>
                        <button type="submit" style={styles.submitBtn}><Send size={18}/></button>
                      </div>
                    </form>
                  )
                ) : (
                  <p style={styles.loggedConfirmation}>✓ Thank you! Feedback logged.</p>
                )}
              </div>
            ) : (
              <div style={styles.warningBox}>
                <h3 style={styles.warningTitle}>
                  <AlertCircle size={20} color="#f3776c" /> Couldn't Find a Match
                </h3>

                <div style={styles.resultImageContainer}>
                  {preview && <img src={preview} alt="Uploaded Part" style={{ ...styles.resultThumb, borderColor: '#fbcdc8' }} />}
                </div>

                <p style={{ color: '#4c2522', margin: '0 0 16px 0', textAlign: 'left', fontSize: 14 }}>
                  No high-confidence match found. Verify part lighting and ensure a singular detached part.
                </p>
                <hr style={{ ...styles.divider, borderColor: '#fbcdc8' }} />

                {!feedbackSent ? (
                  <form onSubmit={handleManualSubmit} style={{ textAlign: 'left' }}>
                    <p style={{ ...styles.dropdownPrompt, color: '#934842' }}>
                      Tell us about the product code so that we can save it:
                    </p>
                    <div style={styles.selectWrapper}>
                      <input
                        list="manual-catalog-list"
                        value={selectedManualCode}
                        onChange={(e) => setSelectedManualCode(e.target.value)}
                        placeholder="Search or select a valid product code..."
                        style={styles.dropdownSelect}
                        required
                      />
                      <datalist id="manual-catalog-list">
                        {masterCatalog.map((part) => (
                          <option key={part.code} value={part.code}>
                            {part.name}
                          </option>
                        ))}
                      </datalist>
                      <button type="submit" style={{ ...styles.submitBtn, backgroundColor: '#f3776c' }}><Send size={18}/></button>
                    </div>
                  </form>
                ) : (
                  <p style={{ ...styles.loggedConfirmation, color: '#934842' }}>✓ Part logged to DynamoDB training pipeline.</p>
                )}
              </div>
            )}

            <button onClick={handleResetSearch} style={styles.secondaryButton}>
              <RefreshCw size={18} /> Search Another Part
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- RIVER BRAND DESIGN STYLES ---
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#fafaf8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#303030'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 28,
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 10px 25px -5px rgba(0, 64, 93, 0.08), 0 8px 10px -6px rgba(0, 64, 93, 0.04)',
    border: '1px solid #eaeaea'
  },
  brandHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid #eaeaea'
  },
  brandTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  logoImage: {
    height: 34,
    objectFit: 'contain'
  },
  logoFallbackText: {
    display: 'none',
    fontSize: 26,
    fontWeight: 900,
    color: '#007db6',
    fontStyle: 'italic',
    letterSpacing: '-1px'
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#dadada'
  },
  headerTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '0.5px',
    wordSpacing: '2px',
    color: '#00405d'
  },
  userBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#00405d',
    backgroundColor: '#deedf6',
    padding: '4px 8px',
    borderRadius: 4,
    maxWidth: 110,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  loginIntro: {
    textAlign: 'center',
    marginBottom: 20
  },
  subHeading: {
    margin: '0 0 6px 0',
    color: '#00405d',
    fontSize: 18,
    fontWeight: 700
  },
  bodyMuted: {
    color: '#5e5e5e',
    fontSize: 13,
    margin: 0
  },
  leftAlignedForm: {
    textAlign: 'left'
  },
  fieldGroup: {
    marginBottom: 16,
    textAlign: 'left'
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#00405d',
    marginBottom: 6,
    textAlign: 'left'
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 6,
    border: '1px solid #dadada',
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#303030',
    outline: 'none',
    boxSizing: 'border-box'
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  eyeToggleBtn: {
    position: 'absolute',
    right: 10,
    background: 'transparent',
    border: 'none',
    color: '#5e5e5e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4
  },
  primaryButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#007db6',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'background-color 0.15s ease'
  },
  secondaryButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#deedf6',
    color: '#00405d',
    border: '1px solid #c4e1ee',
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 18
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #dadada',
    color: '#5e5e5e',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600
  },
  instructionBanner: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#f7fcfe',
    border: '1px solid #c4e1ee',
    borderRadius: 8,
    padding: '12px 14px',
    marginBottom: 16
  },
  instructionText: {
    fontSize: 12,
    color: '#00405d',
    textAlign: 'left',
    lineHeight: '1.45'
  },
  uploadBox: {
    border: '2px dashed #61afd2',
    backgroundColor: '#f7fcfe',
    borderRadius: 8,
    padding: '24px 16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  fileSelectButton: {
    padding: '8px 18px',
    backgroundColor: '#007db6',
    color: '#ffffff',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-block'
  },
  activePreviewBox: {
    border: '1px solid #c4e1ee',
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#f7fcfe',
    display: 'flex',
    alignItems: 'center',
    gap: 14
  },
  mainPreviewImage: {
    width: 72,
    height: 72,
    objectFit: 'cover',
    borderRadius: 6,
    border: '1px solid #dadada'
  },
  previewMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#00405d'
  },
  changeFileButton: {
    fontSize: 12,
    color: '#007db6',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    padding: 20
  },
  warningBox: {
    backgroundColor: '#fef5f4',
    border: '1px solid #f3776c',
    borderRadius: 8,
    padding: 20
  },
  warningTitle: {
    color: '#934842',
    margin: '0 0 14px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 16,
    fontWeight: 700
  },
  successTitle: {
    color: '#16a34a',
    margin: '0 0 14px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 16,
    fontWeight: 700
  },
  resultImageContainer: {
    display: 'flex',
    gap: 16,
    marginBottom: 16,
    justifyContent: 'flex-start'
  },
  thumbCaption: {
    display: 'block',
    fontSize: 11,
    color: '#5e5e5e',
    marginBottom: 4,
    fontWeight: 600
  },
  resultThumb: {
    width: 88,
    height: 88,
    objectFit: 'cover',
    borderRadius: 6,
    border: '2px solid #ffffff',
    boxShadow: '0 2px 6px rgba(0, 64, 93, 0.12)',
    backgroundColor: '#ffffff'
  },
  gridData: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    fontSize: 13,
    textAlign: 'left'
  },
  dataLabel: {
    color: '#5e5e5e',
    fontSize: 12
  },
  reasonText: {
    marginTop: 14,
    marginBottom: 0,
    padding: '8px 10px',
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    fontSize: 12,
    color: '#14532d',
    textAlign: 'left',
    lineHeight: '1.4'
  },
  divider: {
    margin: '18px 0',
    border: 'none',
    borderTop: '1px solid #dadada'
  },
  dropdownPrompt: {
    fontSize: 13,
    fontWeight: 600,
    color: '#00405d',
    marginBottom: 8
  },
  selectWrapper: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },
  dropdownSelect: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #dadada',
    backgroundColor: '#ffffff',
    fontSize: 13,
    color: '#303030',
    outline: 'none',
    cursor: 'text'
  },
  submitBtn: {
    padding: '10px 16px',
    backgroundColor: '#007db6',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  loggedConfirmation: {
    color: '#007db6',
    fontWeight: 700,
    margin: 0,
    textAlign: 'left',
    fontSize: 13
  },
  yesBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    fontWeight: 700
  },
  noBtn: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    fontWeight: 700
  },
  errorText: {
    color: '#dc2626',
    marginTop: 14,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: 600
  }
};