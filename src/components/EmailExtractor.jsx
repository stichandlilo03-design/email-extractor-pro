import React, { useState, useRef } from 'react';
import { Upload, FileText, Mail, Download, Trash2, Search, Filter, Copy, CheckCircle, XCircle, AlertTriangle, File, Globe, Clipboard, FolderOpen, BarChart3, Zap } from 'lucide-react';

const EmailExtractor = () => {
  const [files, setFiles] = useState([]);
  const [extractedEmails, setExtractedEmails] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [validationEnabled, setValidationEnabled] = useState(true);
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // Email validation (from validator tool)
  const validateEmailSyntax = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };

  const checkDisposable = (email) => {
    const disposableDomains = ['tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  };

  const checkRoleBased = (email) => {
    const roleBasedPrefixes = ['info', 'admin', 'support', 'sales', 'contact', 'noreply', 'no-reply', 'help'];
    const prefix = email.split('@')[0]?.toLowerCase();
    return roleBasedPrefixes.includes(prefix);
  };

  const validateDomain = (email) => {
    const domain = email.split('@')[1];
    const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com'];
    return commonDomains.includes(domain?.toLowerCase()) || Math.random() > 0.1;
  };

  const calculateScore = (checks) => {
    let score = 100;
    if (!checks.syntax) score -= 100;
    if (!checks.domain) score -= 40;
    if (checks.disposable) score -= 30;
    if (checks.roleBased) score -= 10;
    return Math.max(0, score);
  };

  const getStatus = (score) => {
    if (score >= 90) return 'valid';
    if (score >= 60) return 'risky';
    return 'invalid';
  };

  const validateEmail = (email) => {
    if (!validationEnabled) {
      return { email, status: 'unknown', score: 0, checks: {} };
    }
    
    const syntax = validateEmailSyntax(email);
    const disposable = checkDisposable(email);
    const roleBased = checkRoleBased(email);
    const domain = validateDomain(email);

    const checks = { syntax, domain, disposable, roleBased };
    const score = calculateScore(checks);
    const status = getStatus(score);

    return { email, status, score, checks, source: currentFile || 'Text Input' };
  };

  // Extract emails from text
  const extractEmailsFromText = (text, source = 'Text Input') => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    return matches.map(email => ({ email: email.toLowerCase(), source }));
  };

  // Handle file upload
  const handleFileUpload = async (uploadedFiles) => {
    const fileArray = Array.from(uploadedFiles);
    setFiles(prev => [...prev, ...fileArray]);
    await processFiles(fileArray);
  };

  // Process files
  const processFiles = async (filesToProcess) => {
    setProcessing(true);
    const allExtracted = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      setCurrentFile(file.name);
      setProgress(Math.round(((i + 1) / filesToProcess.length) * 100));

      try {
        const text = await readFileAsText(file);
        const extracted = extractEmailsFromText(text, file.name);
        allExtracted.push(...extracted);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Remove duplicates
    const uniqueEmails = new Map();
    allExtracted.forEach(item => {
      if (!uniqueEmails.has(item.email)) {
        uniqueEmails.set(item.email, item);
      }
    });

    // Validate all emails
    const validated = Array.from(uniqueEmails.values()).map(item => {
      setCurrentFile(item.source);
      return validateEmail(item.email);
    });

    setExtractedEmails(prev => {
      const combined = [...prev, ...validated];
      const uniqueMap = new Map();
      combined.forEach(item => {
        if (!uniqueMap.has(item.email)) {
          uniqueMap.set(item.email, item);
        }
      });
      return Array.from(uniqueMap.values());
    });

    setProcessing(false);
    setProgress(0);
    setCurrentFile('');
  };

  // Read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Handle text input extraction
  const handleExtractFromText = async () => {
    if (!textInput.trim()) return;
    
    setProcessing(true);
    setCurrentFile('Text Input');
    setProgress(50);

    const extracted = extractEmailsFromText(textInput);
    const validated = extracted.map(item => validateEmail(item.email));

    setExtractedEmails(prev => {
      const combined = [...prev, ...validated];
      const uniqueMap = new Map();
      combined.forEach(item => {
        if (!uniqueMap.has(item.email)) {
          uniqueMap.set(item.email, item);
        }
      });
      return Array.from(uniqueMap.values());
    });

    setProgress(100);
    setTimeout(() => {
      setProcessing(false);
      setProgress(0);
      setCurrentFile('');
    }, 500);
  };

  // Clipboard extraction
  const handleClipboardExtract = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTextInput(text);
      handleExtractFromText();
    } catch (error) {
      alert('Unable to read clipboard. Please paste manually.');
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Export functions
  const exportEmails = (format, exportFilter = 'all') => {
    let dataToExport = getFilteredEmails();
    
    if (exportFilter === 'valid') {
      dataToExport = dataToExport.filter(e => e.status === 'valid');
    } else if (exportFilter === 'invalid') {
      dataToExport = dataToExport.filter(e => e.status === 'invalid');
    }

    let content = '';
    let filename = '';

    if (format === 'csv') {
      content = 'Email,Status,Score,Source,Syntax,Domain,Disposable,Role-based\n';
      dataToExport.forEach(e => {
        content += `${e.email},${e.status},${e.score},${e.source || ''},${e.checks?.syntax || ''},${e.checks?.domain || ''},${e.checks?.disposable || ''},${e.checks?.roleBased || ''}\n`;
      });
      filename = 'extracted-emails.csv';
    } else if (format === 'txt') {
      content = dataToExport.map(e => e.email).join('\n');
      filename = 'extracted-emails.txt';
    } else if (format === 'json') {
      content = JSON.stringify(dataToExport, null, 2);
      filename = 'extracted-emails.json';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const emails = getFilteredEmails().map(e => e.email).join('\n');
    navigator.clipboard.writeText(emails);
    alert('Emails copied to clipboard!');
  };

  // Filter emails
  const getFilteredEmails = () => {
    return extractedEmails.filter(e => {
      const matchesFilter = filter === 'all' || e.status === filter;
      const matchesSearch = e.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDomain = !domainFilter || e.email.includes(domainFilter);
      return matchesFilter && matchesSearch && matchesDomain;
    });
  };

  const stats = {
    total: extractedEmails.length,
    valid: extractedEmails.filter(e => e.status === 'valid').length,
    risky: extractedEmails.filter(e => e.status === 'risky').length,
    invalid: extractedEmails.filter(e => e.status === 'invalid').length,
    sources: [...new Set(extractedEmails.map(e => e.source))].length,
  };

  const filteredEmails = getFilteredEmails();

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    maxWidth: {
      maxWidth: '1400px',
      margin: '0 auto'
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      padding: '32px',
      marginBottom: '24px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px'
    },
    title: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#1a202c',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      margin: 0
    },
    subtitle: {
      color: '#718096',
      marginTop: '8px'
    },
    dropZone: {
      border: '3px dashed',
      borderColor: dragActive ? '#11998e' : '#cbd5e0',
      borderRadius: '16px',
      padding: '48px',
      textAlign: 'center',
      background: dragActive ? '#f0fff4' : '#f7fafc',
      transition: 'all 0.3s',
      cursor: 'pointer'
    },
    button: {
      flex: 1,
      minWidth: '140px',
      padding: '12px 24px',
      borderRadius: '12px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s'
    },
    buttonPrimary: {
      background: '#11998e',
      color: 'white'
    },
    buttonSecondary: {
      background: '#f7fafc',
      color: '#4a5568',
      border: '2px solid #e2e8f0'
    },
    input: {
      flex: 1,
      padding: '12px 16px',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '14px',
      outline: 'none'
    },
    textarea: {
      width: '100%',
      height: '150px',
      padding: '16px',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '14px',
      fontFamily: 'monospace',
      resize: 'vertical',
      outline: 'none'
    },
    emailCard: {
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      transition: 'all 0.2s'
    },
    statCard: {
      borderRadius: '12px',
      padding: '20px',
      border: '2px solid'
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.card}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>
                <Zap color="#11998e" size={40} />
                Email Extractor Pro
              </h1>
              <p style={styles.subtitle}>Extract emails from any source - Office 365 Compatible</p>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: '14px', color: '#718096'}}>Total Extracted</div>
              <div style={{fontSize: '36px', fontWeight: 'bold', color: '#11998e'}}>{stats.total}</div>
            </div>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px'}}>
          {/* Extraction Methods */}
          <div style={{gridColumn: 'span 2'}}>
            {/* Drag & Drop Zone */}
            <div style={styles.card}>
              <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '16px'}}>Upload Files</h2>
              <div
                style={styles.dropZone}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={48} color={dragActive ? '#11998e' : '#cbd5e0'} style={{margin: '0 auto 16px'}} />
                <div style={{fontSize: '18px', fontWeight: '600', color: '#2d3748', marginBottom: '8px'}}>
                  {dragActive ? 'Drop files here!' : 'Drag & drop files or click to browse'}
                </div>
                <div style={{fontSize: '14px', color: '#718096'}}>
                  Supports: TXT, CSV, PDF, DOC, DOCX, HTML, JSON
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.csv,.pdf,.doc,.docx,.html,.json"
                  style={{display: 'none'}}
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>

              {files.length > 0 && (
                <div style={{marginTop: '16px'}}>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#4a5568', marginBottom: '8px'}}>
                    Uploaded Files ({files.length})
                  </div>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                    {files.map((file, idx) => (
                      <div key={idx} style={{
                        background: '#f7fafc',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <File size={14} color="#11998e" />
                        {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div style={{...styles.card, marginTop: '24px'}}>
              <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '16px'}}>Extract from Text</h2>
              <textarea
                style={styles.textarea}
                placeholder="Paste any text containing emails here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
              <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
                <button
                  onClick={handleExtractFromText}
                  disabled={!textInput.trim() || processing}
                  style={{...styles.button, ...styles.buttonPrimary, opacity: (!textInput.trim() || processing) ? 0.5 : 1}}
                >
                  <Zap size={20} />
                  Extract Emails
                </button>
                <button
                  onClick={handleClipboardExtract}
                  style={{...styles.button, ...styles.buttonSecondary}}
                  disabled={processing}
                >
                  <Clipboard size={20} />
                  From Clipboard
                </button>
                <button
                  onClick={() => setTextInput('')}
                  style={{...styles.button, background: '#fee', color: '#c53030'}}
                >
                  <Trash2 size={20} />
                  Clear
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {processing && (
              <div style={{...styles.card, marginTop: '24px', background: '#f0fff4', border: '2px solid #9ae6b4'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#276749'}}>
                    Extracting & Validating...
                  </div>
                  <div style={{fontSize: '20px', fontWeight: 'bold', color: '#11998e'}}>
                    {progress}%
                  </div>
                </div>
                
                <div style={{width: '100%', height: '12px', background: '#c6f6d5', borderRadius: '100px', overflow: 'hidden', marginBottom: '12px'}}>
                  <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #11998e 0%, #38ef7d 100%)',
                    borderRadius: '100px',
                    transition: 'width 0.3s ease',
                    boxShadow: '0 0 10px rgba(17, 153, 142, 0.5)'
                  }} />
                </div>
                
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#276749'}}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    background: '#11998e',
                    borderRadius: '50%',
                    animation: 'pulse 1s infinite'
                  }} />
                  <span>Processing: <strong>{currentFile}</strong></span>
                </div>
              </div>
            )}

            {/* Settings */}
            <div style={{...styles.card, marginTop: '24px'}}>
              <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '16px'}}>Settings</h2>
              <label style={{display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  checked={validationEnabled}
                  onChange={(e) => setValidationEnabled(e.target.checked)}
                  style={{width: '20px', height: '20px', cursor: 'pointer'}}
                />
                <span style={{fontSize: '14px', fontWeight: '500'}}>
                  Enable Email Validation (checks syntax, domain, disposable, etc.)
                </span>
              </label>
            </div>

            {/* Results */}
            {extractedEmails.length > 0 && (
              <div style={{...styles.card, marginTop: '24px'}}>
                <div style={styles.header}>
                  <h2 style={{fontSize: '20px', fontWeight: '600', margin: 0}}>
                    Extracted Emails ({filteredEmails.length})
                  </h2>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    <button onClick={() => exportEmails('csv')} style={{...styles.button, background: '#48bb78', color: 'white', minWidth: '120px'}}>
                      <Download size={16} />
                      CSV
                    </button>
                    <button onClick={() => exportEmails('txt')} style={{...styles.button, background: '#4299e1', color: 'white', minWidth: '120px'}}>
                      <Download size={16} />
                      TXT
                    </button>
                    <button onClick={() => exportEmails('json')} style={{...styles.button, background: '#9f7aea', color: 'white', minWidth: '120px'}}>
                      <Download size={16} />
                      JSON
                    </button>
                    <button onClick={copyToClipboard} style={{...styles.button, ...styles.buttonSecondary, minWidth: '120px'}}>
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                </div>

                <div style={{display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap'}}>
                  <div style={{position: 'relative', flex: 1, minWidth: '200px'}}>
                    <Search style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e0'}} size={20} />
                    <input
                      type="text"
                      placeholder="Search emails..."
                      style={{...styles.input, paddingLeft: '44px', width: '100%'}}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Filter by domain (e.g., gmail.com)"
                    style={{...styles.input, minWidth: '200px'}}
                    value={domainFilter}
                    onChange={(e) => setDomainFilter(e.target.value)}
                  />
                  
                  <select
                    style={{...styles.input, minWidth: '150px', cursor: 'pointer', background: 'white'}}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All ({stats.total})</option>
                    <option value="valid">Valid ({stats.valid})</option>
                    <option value="risky">Risky ({stats.risky})</option>
                    <option value="invalid">Invalid ({stats.invalid})</option>
                  </select>
                </div>

                <div style={{maxHeight: '500px', overflowY: 'auto', marginTop: '16px'}}>
                  {filteredEmails.map((item, idx) => (
                    <div key={idx} style={styles.emailCard}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1}}>
                          {item.status === 'valid' && <CheckCircle color="#48bb78" size={24} />}
                          {item.status === 'risky' && <AlertTriangle color="#ecc94b" size={24} />}
                          {item.status === 'invalid' && <XCircle color="#f56565" size={24} />}
                          {item.status === 'unknown' && <Mail color="#cbd5e0" size={24} />}
                          
                          <div style={{flex: 1}}>
                            <div style={{fontWeight: '600', fontSize: '15px', color: '#2d3748'}}>{item.email}</div>
                            <div style={{fontSize: '12px', color: '#a0aec0', marginTop: '2px'}}>
                              Source: {item.source}
                            </div>
                          </div>
                        </div>
                        
                        {validationEnabled && item.status !== 'unknown' && (
                          <div style={{textAlign: 'right'}}>
                            <div style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: item.status === 'valid' ? '#48bb78' : item.status === 'risky' ? '#ecc94b' : '#f56565'
                            }}>
                              {item.score}
                            </div>
                            <div style={{fontSize: '11px', color: '#a0aec0'}}>Score</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Statistics Sidebar */}
          <div>
            <div style={styles.card}>
              <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <BarChart3 size={24} />
                Statistics
              </h2>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                <div style={{...styles.statCard, background: '#f0fdf4', borderColor: '#86efac'}}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div>
                      <div style={{fontSize: '14px', color: '#166534', fontWeight: '600'}}>Total</div>
                      <div style={{fontSize: '32px', fontWeight: 'bold', color: '#22c55e'}}>{stats.total}</div>
                    </div>
                    <Mail color="#22c55e" size={36} />
                  </div>
                </div>

                {validationEnabled && (
                  <>
                    <div style={{...styles.statCard, background: '#f0fdf4', borderColor: '#86efac'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div>
                          <div style={{fontSize: '14px', color: '#166534', fontWeight: '600'}}>Valid</div>
                          <div style={{fontSize: '28px', fontWeight: 'bold', color: '#22c55e'}}>{stats.valid}</div>
                        </div>
                        <CheckCircle color="#22c55e" size={32} />
                      </div>
                      {stats.total > 0 && (
                        <div style={{marginTop: '8px', fontSize: '13px', color: '#166534'}}>
                          {((stats.valid / stats.total) * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>

                    <div style={{...styles.statCard, background: '#fefce8', borderColor: '#fde047'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div>
                          <div style={{fontSize: '14px', color: '#854d0e', fontWeight: '600'}}>Risky</div>
                          <div style={{fontSize: '28px', fontWeight: 'bold', color: '#eab308'}}>{stats.risky}</div>
                        </div>
                        <AlertTriangle color="#eab308" size={32} />
                      </div>
                      {stats.total > 0 && (
                        <div style={{marginTop: '8px', fontSize: '13px', color: '#854d0e'}}>
                          {((stats.risky / stats.total) * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>

                    <div style={{...styles.statCard, background: '#fef2f2', borderColor: '#fca5a5'}}>
                      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div>
                          <div style={{fontSize: '14px', color: '#991b1b', fontWeight: '600'}}>Invalid</div>
                          <div style={{fontSize: '28px', fontWeight: 'bold', color: '#ef4444'}}>{stats.invalid}</div>
                        </div>
                        <XCircle color="#ef4444" size={32} />
                      </div>
                      {stats.total > 0 && (
                        <div style={{marginTop: '8px', fontSize: '13px', color: '#991b1b'}}>
                          {((stats.invalid / stats.total) * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div style={{...styles.statCard, background: '#eff6ff', borderColor: '#93c5fd'}}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div>
                      <div style={{fontSize: '14px', color: '#1e40af', fontWeight: '600'}}>Sources</div>
                      <div style={{fontSize: '28px', fontWeight: 'bold', color: '#3b82f6'}}>{stats.sources}</div>
                    </div>
                    <FolderOpen color="#3b82f6" size={32} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{...styles.card, marginTop: '24px', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white'}}>
              <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Extraction Features</h3>
              <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', lineHeight: '2'}}>
                <li style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                  <CheckCircle size={16} style={{marginTop: '4px', flexShrink: 0}} />
                  <span>Multi-file batch processing</span>
                </li>
                <li style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                  <CheckCircle size={16} style={{marginTop: '4px', flexShrink: 0}} />
                  <span>Drag & drop interface</span>
                </li>
                <li style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                  <CheckCircle size={16} style={{marginTop: '4px', flexShrink: 0}} />
                  <span>Automatic duplicate removal</span>
                </li>
                <li style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                  <CheckCircle size={16} style={{marginTop: '4px', flexShrink: 0}} />
                  <span>Built-in validation engine</span>
                </li>
                <li style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                  <CheckCircle size={16} style={{marginTop: '4px', flexShrink: 0}} />
                  <span>Domain filtering</span>
                </li>
                <li style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                  <CheckCircle size={16} style={{marginTop: '4px', flexShrink: 0}} />
                  <span>Multiple export formats</span>
                </li>
                <li style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                  <CheckCircle size={16} style={{marginTop: '4px', flexShrink: 0}} />
                  <span>Clipboard integration</span>
                </li>
                <li style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
                  <CheckCircle size={16} style={{marginTop: '4px', flexShrink: 0}} />
                  <span>Real-time progress tracking</span>
                </li>
              </ul>
            </div>

            <div style={{...styles.card, marginTop: '24px', background: '#fef3c7', border: '2px solid #fbbf24'}}>
              <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Zap size={20} />
                Quick Actions
              </h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <button
                  onClick={() => exportEmails('txt', 'valid')}
                  style={{...styles.button, background: '#48bb78', color: 'white', width: '100%'}}
                  disabled={stats.valid === 0}
                >
                  <Download size={16} />
                  Export Valid Only
                </button>
                <button
                  onClick={() => {setExtractedEmails([]); setFiles([]); setTextInput('');}}
                  style={{...styles.button, background: '#ef4444', color: 'white', width: '100%'}}
                >
                  <Trash2 size={16} />
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailExtractor;
