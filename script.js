
        const API_URL = 'https://script.google.com/macros/s/AKfycbzFF2y1oQA1ZEqrsRhUinKDiKiNX2rh-Hwgrr3pLKqZ4LKRbnHLiQm8Jb1lmgQtCC9vWQ/exec';
        
        let html5Qrcode = null;
        let currentQRData = '';
        let selectedName = '';
        let selectedUniform = '';
        let isScanning = false;
        let cameras = [];
        let currentCameraIndex = 0;
    
        // Toast Notification System
        function showToast(message, type = 'info', duration = 3000) {
            const toastContainer = document.getElementById('toast-container');
            const toast = document.createElement('div');
            
            // Set toast content and styling
            toast.className = `toast ${type}`;
            
            // Set icon based on type
            let icon = '';
            switch(type) {
                case 'success': icon = '✅'; break;
                case 'error': icon = '❌'; break;
                case 'warning': icon = '⚠️'; break;
                case 'info': 
                default: icon = '📷'; break;
            }
            
            toast.innerHTML = `
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${message}</span>
            `;
            
            // Add to container
            toastContainer.appendChild(toast);
            
            // Trigger animation
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            // Auto remove
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 400);
            }, duration);
        }
    
        // Get available cameras
        async function getCameras() {
            try {
                const devices = await Html5Qrcode.getCameras();
                cameras = devices;
                console.log('Available cameras:', cameras);
                
                if (cameras.length > 0) {
                    showToast(`Found ${cameras.length} camera(s)`, 'success', 2000);
                    
                    // Find the best camera to start with (prefer back camera)
                    const backCameraIndex = cameras.findIndex(camera => 
                        camera.label.toLowerCase().includes('back') || 
                        camera.label.toLowerCase().includes('rear') ||
                        camera.label.toLowerCase().includes('environment')
                    );
                    
                    currentCameraIndex = backCameraIndex !== -1 ? backCameraIndex : 0;
                } else {
                    showToast('No cameras detected', 'error');
                    throw new Error('No cameras found');
                }
                
                return cameras;
            } catch (error) {
                console.error('Error getting cameras:', error);
                showToast('Error detecting cameras', 'error');
                throw error;
            }
        }
    
        // Switch camera
        async function switchCamera() {
            if (cameras.length <= 1) {
                showToast('Only one camera available', 'warning');
                return;
            }
            
            try {
                // Disable the switch button to prevent multiple clicks
                const switchBtn = document.getElementById('camera-switch-btn');
                switchBtn.disabled = true;
                
                showToast('Switching camera...', 'info', 1500);
                
                // Properly stop current scanner
                if (html5Qrcode && isScanning) {
                    await html5Qrcode.stop();
                    html5Qrcode = null;
                    isScanning = false;
                }
                
                // Switch to next camera
                currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
                const currentCamera = cameras[currentCameraIndex];
                
                // Get camera type for display
                const cameraType = getCameraType(currentCamera);
                
                // Wait a bit before starting new camera
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Start with new camera
                await startScanner();
                
                // Show success message
                showToast(`Switched to ${cameraType} camera`, 'success', 2000);
                
                // Re-enable switch button
                switchBtn.disabled = false;
                
            } catch (error) {
                console.error('Error switching camera:', error);
                showToast(`Error switching camera: ${error.message}`, 'error');
                
                // Reset UI state
                isScanning = false;
                document.getElementById('start-btn').classList.remove('hidden');
                document.getElementById('stop-btn').classList.add('hidden');
                document.getElementById('qr-reader').innerHTML = '<div class="scanner-placeholder">Click "Start Scanning" to begin</div>';
                
                // Re-enable switch button
                document.getElementById('camera-switch-btn').disabled = false;
            }
        }
    
        // Get camera type for display
        function getCameraType(camera) {
            if (!camera) return 'unknown';
            
            const label = camera.label.toLowerCase();
            if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
                return 'back';
            } else if (label.includes('front') || label.includes('user') || label.includes('facing')) {
                return 'front';
            } else {
                return `camera ${currentCameraIndex + 1}`;
            }
        }
    
        // Start QR Scanner
        async function startScanner() {
            try {
                // Get cameras if not already retrieved
                if (cameras.length === 0) {
                    showToast('Getting camera list...', 'info', 2000);
                    await getCameras();
                }
    
                // Ensure any existing scanner is properly stopped
                if (html5Qrcode) {
                    try {
                        await html5Qrcode.stop();
                    } catch (e) {
                        console.log('Scanner was already stopped');
                    }
                    html5Qrcode = null;
                }
    
                // Create new Html5Qrcode instance
                html5Qrcode = new Html5Qrcode("qr-reader");
    
                // Get current camera
                const currentCamera = cameras[currentCameraIndex];
                const cameraType = getCameraType(currentCamera);
                
                showToast(`Starting ${cameraType} camera...`, 'info', 2000);
    
                // Configuration for the scanner
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true,
                    disableFlip: false,
                };
    
                // Start scanning with the selected camera
                await html5Qrcode.start(
                    currentCamera.id,
                    config,
                    onScanSuccess,
                    onScanFailure
                );
                
                isScanning = true;
                
                // Update UI - show stop button, hide start button
                document.getElementById('start-btn').classList.add('hidden');
                document.getElementById('stop-btn').classList.remove('hidden');
                
                showToast(`Scanner active - point at QR code`, 'success', 2500);
                
            } catch (error) {
                console.error('Scanner start error:', error);
                
                // Clean up on error
                if (html5Qrcode) {
                    try {
                        await html5Qrcode.stop();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    html5Qrcode = null;
                }
                
                // Show error
                showToast(`Failed to start camera: ${error.message}`, 'error');
                
                // Reset UI state
                document.getElementById('start-btn').classList.remove('hidden');
                document.getElementById('stop-btn').classList.add('hidden');
                isScanning = false;
                
                // Reset qr-reader div content
                document.getElementById('qr-reader').innerHTML = '<div class="scanner-placeholder">Camera failed to start</div>';
            }
        }
    
        // Stop QR Scanner
        async function stopScanner() {
            if (html5Qrcode && isScanning) {
                try {
                    await html5Qrcode.stop();
                    html5Qrcode = null;
                    document.getElementById('qr-reader').innerHTML = '<div class="scanner-placeholder">Scanner stopped</div>';
                    showToast('Scanner stopped', 'info', 2000);
                } catch (error) {
                    console.error('Error stopping scanner:', error);
                    // Force cleanup even if stop() fails
                    html5Qrcode = null;
                    document.getElementById('qr-reader').innerHTML = '<div class="scanner-placeholder">Scanner stopped</div>';
                }
            }
            
            isScanning = false;
            updateUI();
        }
    
        // Update UI after stopping scanner
        function updateUI() {
            document.getElementById('start-btn').classList.remove('hidden');
            document.getElementById('stop-btn').classList.add('hidden');
        }
    
        // Handle scan failure (not necessarily an error)
        function onScanFailure(error) {
            // This is called when scanning fails, which is normal when no QR code is detected
            // We don't need to do anything here
        }
    
        // Handle successful QR scan
        function onScanSuccess(decodedText, decodedResult) {
            if (!isScanning) return; // Ignore if scanner is stopped
    
            // Stop scanner after successful scan
            stopScanner();
            
            showToast('QR Code scanned successfully!', 'success', 2000);
            
            // Process the QR data
            processQRData(decodedText);
        }
    
        function processQRData(qrData) {
            currentQRData = qrData;
            showLoading(true, 'name-modal');
            
            fetch(`${API_URL}?action=parse&qrData=${encodeURIComponent(qrData)}`)
                .then(response => response.json())
                .then(data => {
                    showLoading(false, 'name-modal');
                    
                    if (data.success) {
                        if (data.multipleNames) {
                            displayNameSelection(data.names);
                        } else if (data.singleName) {
                            selectedName = data.name;
                            showUniformModal();
                        }
                    } else {
                        showToast(data.error || 'Invalid QR data', 'error');
                    }
                })
                .catch(error => {
                    showLoading(false, 'name-modal');
                    showToast('Error processing QR code', 'error');
                    console.error(error);
                });
        }
        

        // Display name selection modal
        function displayNameSelection(names) {
            const nameList = document.getElementById('name-list');
            nameList.innerHTML = '';
            
            names.forEach((name, index) => {
                const btn = document.createElement('button');
                btn.className = 'name-btn';
                btn.textContent = name;
                btn.onclick = () => selectName(name, btn);
                nameList.appendChild(btn);
            });
            
            // Reset selection state
            selectedName = '';
            
            // Show modal
            showModal('name-modal');
        }
    
        // Handle name selection
        function selectName(name, btnElement) {
            document.querySelectorAll('.name-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            btnElement.classList.add('selected');
            selectedName = name;
            
            // Automatically proceed to uniform modal after a brief delay
            setTimeout(() => {
                closeModalSafely('name-modal');
                showUniformModal();
            }, 500);
        }
    
        // Show uniform modal
        function showUniformModal() {
            document.getElementById('selected-name-display').textContent = selectedName;
            
            // Reset uniform selection
            selectedUniform = '';
            document.querySelectorAll('.uniform-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            showModal('uniform-modal');
        }
    
        // Handle uniform selection
        function selectUniform(compliance, btnElement) {
            document.querySelectorAll('.uniform-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            btnElement.classList.add('selected');
            selectedUniform = compliance;
            
            // Automatically submit after a brief delay
            setTimeout(() => {
                submitRecord();
            }, 100);
        }

        let lastScanTime = 0;

        function submitRecord() {
            // Prevent rapid duplicate submissions
            if (Date.now() - lastScanTime < 2000) return;
            lastScanTime = Date.now();
            if (!selectedName || !selectedUniform) {
                showToast('Please complete selection', 'error');
                return;
            }
        
            showLoading(true, 'uniform-modal');
            
            const params = new URLSearchParams({
                action: 'save',
                selectedName: selectedName,
                uniformCompliance: selectedUniform
                // Removed qrData since we're not checking duplicates
            });
        
            fetch(`${API_URL}?${params}`)
                .then(response => response.json())
                .then(data => {
                    showToast(data.message || `Attendance recorded for ${selectedName}`, 'success');
                    closeModalSafely('uniform-modal');
                    resetForm();
                })
                .catch(error => {
                    console.log('Background save:', error); // Silent error logging
                })
                .finally(() => {
                    showLoading(false, 'uniform-modal');
                });
        }
    
        function closeModalSafely(modalId) {
            try {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('active');
                    document.body.style.overflow = '';
                    // Ensure loading is hidden when closing
                    showLoading(false, modalId);
                }
            } catch (e) {
                console.error('Error closing modal:', e);
            }
        }
    
        // Modal functions
        function showModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }
        }
    
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeModalSafely(e.target.id);
            }
        });
    
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal-overlay.active');
                if (activeModal) {
                    closeModalSafely(activeModal.id);
                }
            }
        });
    
        function resetForm() {
            // Clear all variables
            currentQRData = '';
            selectedName = '';
            selectedUniform = '';
            
            // Reset UI elements
            document.getElementById('scan-result').style.display = 'none';
            
            // Clear any selected buttons in name modal
            document.querySelectorAll('.name-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Clear any selected buttons in uniform modal
            document.querySelectorAll('.uniform-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Ensure loading states are hidden
            showLoading(false, 'name-modal');
            showLoading(false, 'uniform-modal');
            
            // Close any open modals
            closeModalSafely('name-modal');
            closeModalSafely('uniform-modal');
            
            // Restart scanner after a brief delay
            setTimeout(() => {
                if (!isScanning) {
                    startScanner();
                }
            }, 1000);
        }
    
        // Show loading state in modal
        function showLoading(show, modalId) {
            const loadingElement = document.getElementById(`${modalId}-loading`);
            if (loadingElement) {
                loadingElement.style.display = show ? 'flex' : 'none';
            }
        }
    
        // Initialize when page loads
        window.addEventListener('load', () => {
            // Initialize cameras list but don't auto-start
            getCameras().catch(console.error);
        });
    
        // Handle visibility change to restart scanner when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !isScanning) {
                setTimeout(() => {
                    if (!isScanning) {
                        // Don't auto-restart, let user click the button
                        console.log('Page visible again, ready to start scanner');
                    }
                }, 500);
            }
        });
    
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (html5Qrcode && isScanning) {
                html5Qrcode.stop().catch(console.error);
            }
        });
    
