import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Load Google Identity Services on component mount
  useEffect(() => {
    const loadGoogleScript = () => {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          initializeGoogleSignIn();
        };
        document.head.appendChild(script);
      } else {
        initializeGoogleSignIn();
      }
    };

    loadGoogleScript();
  }, []);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();
      
      if (data.success) {
        setStep('otp');
        if (data.message.includes('console') || data.message.includes('dev mode')) {
          setMessage('OTP sent to server console! Check your server logs for the code.');
        } else {
          setMessage('OTP sent to your phone!');
        }
      } else {
        setMessage(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, otp }),
      });

      const data: LoginResponse = await response.json();
      
      if (data.success && data.token && data.user) {
        // Use AuthContext login function to properly set user state
        await login(data.token, data.user);
        
        setMessage('Login successful! Redirecting...');
        // useEffect will handle redirect when user state updates
      } else {
        setMessage(data.message || 'Invalid OTP');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setMessage('');

    try {
      // Load Google Identity Services
      if (!window.google) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
          initializeGoogleSignIn();
        };
        document.head.appendChild(script);
      } else {
        initializeGoogleSignIn();
      }
    } catch (error) {
      setMessage('Failed to load Google Sign-In');
      setGoogleLoading(false);
    }
  };


  const showFallbackButton = () => {
    const fallbackButton = document.getElementById('google-fallback-button');
    if (fallbackButton) {
      fallbackButton.classList.remove('hidden');
    }
  };

  const initializeGoogleSignIn = () => {
    if (!window.google) {
      console.log('Google Identity Services not loaded yet');
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID is not set');
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
      });

      const buttonElement = document.getElementById('google-signin-button');
      if (buttonElement) {
        window.google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          width: '100%',
        });
      } else {
        console.error('Google sign-in button element not found');
        showFallbackButton();
      }
    } catch (error) {
      console.error('Error initializing Google Sign-In:', error);
      showFallbackButton();
    }
  };

  const handleGoogleCallback = async (response: any) => {
    setGoogleLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const data: LoginResponse = await res.json();
      
      if (data.success && data.token && data.user) {
        // Use AuthContext login function to properly set user state
        await login(data.token, data.user);
        
        setMessage('Google login successful! Redirecting...');
        setGoogleLoading(false);
        // useEffect will handle redirect when user state updates
      } else {
        setMessage(data.message || 'Google login failed');
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error('Google login error:', error);
      setMessage('Google login failed: ' + (error as Error).message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to BizTalkAI
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use your phone number with OTP or Google account
          </p>
        </div>

        <Card className="p-6">
          {step === 'phone' ? (
            <>
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1"
                    placeholder="Enter your phone number (e.g., +1234567890)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !phoneNumber}
                  className="w-full"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
              
              <div className="mt-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div id="google-signin-button" className="w-full mt-4"></div>
                
                {/* Fallback Google button - only show if Google script fails to load */}
                <div id="google-fallback-button" className="w-full mt-4 hidden">
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                  Enter OTP
                </label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-1"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
                <p className="mt-1 text-sm text-gray-500">
                  We sent a 6-digit code to {phoneNumber}
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || !otp}
                className="w-full"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('phone')}
                className="w-full"
              >
                Back to phone number
              </Button>
            </form>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded-md ${
              message.includes('successful') || message.includes('sent')
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// Extend Window interface for Google Sign-In
declare global {
  interface Window {
    google: any;
  }
}
