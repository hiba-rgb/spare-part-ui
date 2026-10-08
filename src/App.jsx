import React, { useState } from 'react';
import { Lock, Upload, CheckCircle, XCircle, RefreshCw, AlertCircle, Send, ArrowLeft } from 'lucide-react';

const APP_PASSWORD = "password123";

export default function App() {
  // Login States
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Request Access States
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  
  // App States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  // Feedback States
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isIncorrectMarked, setIsIncorrectMarked] = useState(false);
  const [correctionName, setCorrectionName] = useState('');
  const [manualPartName, setManualPartName] = useState('');
  const [error, setError] = useState('');

  // --- HANDLERS ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === APP_PASSWORD && loginId.trim() !== '') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid Login ID or Password. Access denied.');
    }
  };

  const handleRequestAccess = (e) => {
    e.preventDefault();
    if (requestEmail.trim() === '') return;
    console.log(`Simulating email to hiba@rideriver.com for user: ${requestEmail}`);
    setRequestSent(true);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) return setError('Upload a maximum of 3 photos.');
    setError('');
    setSelectedFiles(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSearch = async () => {
    if (selectedFiles.length === 0) return setError('Please select a photo.');
    setLoading(true);
    setError('');
    setResult(null);
    setFeedbackSent(false);
    setIsIncorrectMarked(false);
    setCorrectionName('');
    setManualPartName('');

    setTimeout(() => {
      // Exactly 50/50 chance for success or failure
      const isSuccess = Math.random() > 0.5; 
      
      if (isSuccess) {
        setResult({
          isMatch: true,
          productCode: "FLG-882-B",
          productName: "Flange Assembly Type B",
          status: "Serviceable",
          genEligibility: "Gen-2.5",
          confidence: 97.2,
          accuracy: "94.5%",
        });
      } else {
        setResult({ isMatch: false });
      }
      setLoading(false);
    }, 1500);
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
    if (correctionName.trim() === '') return;
    setFeedbackSent(true);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualPartName.trim() === '') return;
    setFeedbackSent(true);
  };

  const handleResetSearch = () => {
    setResult(null);
    setSelectedFiles([]);
    setPreviews([]);
    setFeedbackSent(false);
    setIsIncorrectMarked(false);
    setCorrectionName('');
    setManualPartName('');
    setError('');
  };

  // --- UI: LOGIN & REQUEST ACCESS SCREEN ---
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          {!showRequestAccess ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <Lock size={40} color="#2563eb" style={{ marginBottom: 12 }} />
                <h2 style={{ margin: 0 }}>Restricted Access</h2>
                <p style={{ color: '#6b7280', fontSize: 14 }}>Enter your credentials to access the portal.</p>
              </div>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 12 }}>
                  <label style={styles.label}>Login ID</label>
                  <input type="text" placeholder="e.g., TECH-409" value={loginId} onChange={(e) => setLoginId(e.target.value)} style={styles.input} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={styles.label}>Password</label>
                  <input type="password" placeholder="Enter Password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
                </div>
                <button type="submit" style={styles.button}>Login</button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={() => setShowRequestAccess(true)} style={styles.linkBtn}>Request Access</button>
              </div>
            </>
          ) : (
            <>
              <button onClick={() => { setShowRequestAccess(false); setRequestSent(false); }} style={styles.backBtn}>
                <ArrowLeft size={16} /> Back to Login
              </button>
              
              {!requestSent ? (
                <form onSubmit={handleRequestAccess} style={{ marginTop: 16 }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>Request Account</h3>
                  <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
                    Enter your email address. Admin (hiba@rideriver.com) will review your request.
                  </p>
                  <label style={styles.label}>Email Address</label>
                  <input type="email" placeholder="you@company.com" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} style={{...styles.input, marginBottom: 16}} required />
                  <button type="submit" style={styles.button}>Send Request</button>
                </form>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle size={40} color="#16a34a" style={{ marginBottom: 12 }} />
                  <h3 style={{ margin: '0 0 8px 0', color: '#16a34a' }}>Request Sent!</h3>
                  <p style={{ color: '#6b7280', fontSize: 14 }}>hiba@rideriver.com has been notified. You will receive an email once approved.</p>
                </div>
              )}
            </>
          )}
          {error && <p style={styles.errorText}>{error}</p>}
        </div>
      </div>
    );
  }

  // --- UI: MAIN SEARCH DASHBOARD ---
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            🔍 Spare Part Search
          </h2>
          <button onClick={() => setIsAuthenticated(false)} style={styles.logoutBtn}>Logout</button>
        </div>
        
        {!result && (
          <>
            <div style={styles.uploadBox}>
              <Upload size={32} color="#6b7280" />
              <input type="file" accept="image/png, image/jpeg" multiple onChange={handleFileChange} style={{ marginTop: 12 }} />
            </div>
            {previews.length > 0 && (
              <div style={styles.previewContainer}>
                {previews.map((src, idx) => <img key={idx} src={src} alt="Preview" style={styles.previewImg} />)}
              </div>
            )}
            {error && <p style={styles.errorText}>{error}</p>}
            <button onClick={handleSearch} disabled={loading || selectedFiles.length === 0} style={{ ...styles.button, marginTop: 16 }}>
              {loading ? <RefreshCw className="spin" size={20} /> : 'Search Database'}
            </button>
          </>
        )}

        {/* --- UI: RESULTS SECTION --- */}
        {result && (
          <div>
            {result.isMatch ? (
              <div style={styles.successBox}>
                <h3 style={{ color: '#16a34a', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={20} /> Match Found
                </h3>
                
                {/* UPLOADED IMAGE (Top Left inside the box) */}
                <div style={styles.resultImageContainerLeft}>
                  {previews.map((src, idx) => (
                    <img key={idx} src={src} alt="Uploaded Part" style={styles.resultImgSmall} />
                  ))}
                </div>

                {/* LEFT ALIGNED GRID */}
                <div style={styles.gridLeft}>
                  <div><span style={styles.dataLabel}>Product Code</span><br/><strong>{result.productCode}</strong></div>
                  <div><span style={styles.dataLabel}>Product Name</span><br/><strong>{result.productName}</strong></div>
                  <div>
                    <span style={styles.dataLabel}>Status</span><br/>
                    <span style={{ color: result.status === 'Serviceable' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{result.status}</span>
                  </div>
                  <div><span style={styles.dataLabel}>Gen Eligibility</span><br/><strong>{result.genEligibility}</strong></div>
                  <div><span style={styles.dataLabel}>AI Confidence</span><br/><strong>{result.confidence}%</strong></div>
                  <div><span style={styles.dataLabel}>Historical Accuracy</span><br/><strong>{result.accuracy}</strong></div>
                </div>

                <hr style={styles.divider} />
                
                {/* FEEDBACK FLOW */}
                {!feedbackSent ? (
                  !isIncorrectMarked ? (
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontWeight: 'bold', marginTop: 0 }}>Is this the correct part?</p>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => handleFeedback(true)} style={styles.yesBtn}><CheckCircle size={18} /> Yes</button>
                        <button onClick={() => handleFeedback(false)} style={styles.noBtn}><XCircle size={18} /> No</button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleCorrectionSubmit} style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 14, fontWeight: 'bold', color: '#92400e', marginBottom: 8 }}>
                        Help us improve. What is the correct part code or name?
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" placeholder="e.g., FLG-882-C" value={correctionName} onChange={(e) => setCorrectionName(e.target.value)} style={styles.input} required />
                        <button type="submit" style={styles.submitBtn}><Send size={18}/></button>
                      </div>
                    </form>
                  )
                ) : (
                  <p style={{ color: '#2563eb', fontWeight: 'bold', margin: 0, textAlign: 'left' }}>Thank you! Feedback logged.</p>
                )}
              </div>
            ) : (
              <div style={styles.warningBox}>
                <h3 style={{ color: '#b45309', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={20} /> Couldn't Find a Match
                </h3>

                {/* UPLOADED IMAGE (Top Left) */}
                <div style={styles.resultImageContainerLeft}>
                  {previews.map((src, idx) => (
                    <img key={idx} src={src} alt="Uploaded Part" style={{...styles.resultImgSmall, borderColor: '#fde68a'}} />
                  ))}
                </div>

                <p style={{ color: '#78350f', margin: '0 0 16px 0', textAlign: 'left' }}>Try another picture, or check lighting.</p>
                <hr style={{...styles.divider, borderColor: '#fde68a'}} />
                
                {!feedbackSent ? (
                  <form onSubmit={handleManualSubmit} style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 'bold', color: '#92400e', marginBottom: 8 }}>
                      We have registered your query. Help us improve by labeling this part:
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input type="text" placeholder="e.g., Valve Assembly 4-Inch" value={manualPartName} onChange={(e) => setManualPartName(e.target.value)} style={{...styles.input, marginBottom: 0}} required />
                      <button type="submit" style={styles.submitBtn}><Send size={18}/></button>
                    </div>
                  </form>
                ) : (
                  <p style={{ color: '#b45309', fontWeight: 'bold', margin: 0, textAlign: 'left' }}><CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}/> Part logged for model training.</p>
                )}
              </div>
            )}
            
            <button onClick={handleResetSearch} style={styles.secondaryButton}>
              <RefreshCw size={18} /> Try Another Part
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- CSS STYLES ---
const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16, fontFamily: 'system-ui, -apple-system, sans-serif' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 24, maxWidth: 500, width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  label: { display: 'block', fontSize: 13, fontWeight: 'bold', color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '10px 14px', borderRadius: 6, border: '1px solid #d1d5db', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  secondaryButton: { width: '100%', padding: '12px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 },
  logoutBtn: { backgroundColor: 'transparent', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  linkBtn: { backgroundColor: 'transparent', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', fontSize: 14, padding: 0 },
  backBtn: { backgroundColor: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: 0, display: 'flex', alignItems: 'center', gap: 4 },
  uploadBox: { border: '2px dashed #d1d5db', borderRadius: 8, padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  previewContainer: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' },
  previewImg: { width: 70, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' },
  successBox: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 20 },
  warningBox: { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 20 },
  
  resultImageContainerLeft: { display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'flex-start' },
  resultImgSmall: { width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '2px solid #ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  
  gridLeft: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: 14, textAlign: 'left' },
  dataLabel: { color: '#6b7280', fontSize: 12 },
  divider: { margin: '20px 0', border: 'none', borderTop: '1px solid #d1d5db' },
  errorText: { color: '#dc2626', marginTop: 12, fontSize: 14, textAlign: 'center' },
  
  yesBtn: { flex: 1, padding: '10px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 'bold' },
  noBtn: { flex: 1, padding: '10px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 'bold' },
  submitBtn: { padding: '0 16px', backgroundColor: '#b45309', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }
};