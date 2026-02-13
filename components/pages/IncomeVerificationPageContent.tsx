'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertCircle, Coins, CreditCard, Gift, Sparkles, X, Copy, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export function IncomeVerificationPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [userPoints, setUserPoints] = React.useState<number>(0);
  const [selectedOption, setSelectedOption] = React.useState<'points' | 'dollar' | null>(null);
  const [couponCode, setCouponCode] = React.useState('');
  const [couponApplied, setCouponApplied] = React.useState(false);
  const [finalPrice, setFinalPrice] = React.useState(50);

  const PREMIUM_POINTS_COST = 5000;
  const PREMIUM_DOLLAR_COST = 50;
  const DISCOUNT_COUPON = 'PREMIUM40';
  const DISCOUNT_AMOUNT = 40;

  React.useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadUserPoints();
    checkPremiumStatus();
  }, [user, router]);

  async function loadUserPoints() {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles').select('points').eq('id', user.id).single();

      if (error) throw error;
      setUserPoints(data?.points || 0);
    } catch (error) {
      console.error('Error loading user points:', error);
    }
  }

  async function checkPremiumStatus() {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();

      if (error) throw error;
      if (data?.is_premium) {
        toast.success('You are already a premium seller!');
        router.push('/recommended-direct-sellers');
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  }

  const handleCouponApply = () => {
    if (couponCode.toUpperCase() === DISCOUNT_COUPON) {
      setCouponApplied(true);
      setFinalPrice(PREMIUM_DOLLAR_COST - DISCOUNT_AMOUNT);
      toast.success(`Coupon applied! You save $${DISCOUNT_AMOUNT}`);
    } else {
      toast.error('Invalid coupon code');
      setCouponCode('');
    }
  };

  const handlePointsPayment = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (userPoints < PREMIUM_POINTS_COST) {
      toast.error(`Insufficient points. You need ${PREMIUM_POINTS_COST} points but only have ${userPoints}`);
      return;
    }

    try {
      setLoading(true);

      // Deduct points using award_points with negative value
      const { error: pointsError } = await supabase.rpc('award_points', {
        user_id: user.id,
        points_to_award: -PREMIUM_POINTS_COST,
        action: 'premium_upgrade_points',
      });

      if (pointsError) throw pointsError;

      // Update user to premium using RPC function
      const { error: premiumError } = await supabase.rpc('upgrade_to_premium');

      if (premiumError) throw premiumError;

      toast.success('Congratulations! You are now a Premium Seller!');
      setTimeout(() => {
        router.push('/recommended-direct-sellers');
      }, 2000);
    } catch (error: any) {
      console.error('Error processing points payment:', error);
      toast.error('Error processing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDollarPayment = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    try {
      setLoading(true);

      // In a real application, you would integrate with a payment gateway like Stripe here
      // For now, we'll simulate the payment and upgrade the user

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update user to premium using RPC function
      const { error: premiumError } = await supabase.rpc('upgrade_to_premium');

      if (premiumError) throw premiumError;

      toast.success(`Payment successful! You are now a Premium Seller!`);
      setTimeout(() => {
        router.push('/recommended-direct-sellers');
      }, 2000);
    } catch (error: any) {
      console.error('Error processing dollar payment:', error);
      toast.error('Error processing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-1xl font-extrabold text-gray-900 sm:text-4xl mb-1">Apply for Premium Seller</h1>
         
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-yellow-500" />
            Premium Benefits
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Premium Badge</h3>
                <p className="text-sm text-gray-600">Get verified with a premium badge</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Featured Listings</h3>
                <p className="text-sm text-gray-600">Appear in premium seller listings</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Priority Search</h3>
                <p className="text-sm text-gray-600">Get priority in search results</p>
              </div>
            </div>
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Unlimited Connections</h3>
                <p className="text-sm text-gray-600">Connect with unlimited sellers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mb-8">
          {/* Points Payment Option */}
          <div
            className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all ${
              selectedOption === 'points' ? 'border-yellow-500 shadow-xl' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center mr-3">
                  <Coins className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Pay with Points</h3>
                  <p className="text-sm text-gray-600">Use your earned points</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline mb-2">
                <span className="text-3xl font-extrabold text-gray-900">{PREMIUM_POINTS_COST.toLocaleString()}</span>
                <span className="text-gray-600 ml-2">points</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <span>Your balance: </span>
                <span
                  className={`font-semibold ml-1 ${
                    userPoints >= PREMIUM_POINTS_COST ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {userPoints.toLocaleString()} points
                </span>
              </div>
              {userPoints < PREMIUM_POINTS_COST && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>Insufficient points</span>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedOption('points');
                handlePointsPayment();
              }}
              disabled={loading || userPoints < PREMIUM_POINTS_COST}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                userPoints >= PREMIUM_POINTS_COST
                  ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : `Pay ${PREMIUM_POINTS_COST.toLocaleString()} Points`}
            </button>
          </div>

          {/* Dollar Payment Option */}
          <div
            className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all relative overflow-hidden ${
              selectedOption === 'dollar' ? 'border-yellow-500 shadow-xl' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center mr-3">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Pay with Card</h3>
                  <p className="text-sm text-gray-600">Secure payment</p>
                </div>
              </div>
            </div>

            {/* Flashing Coupon Code Message */}
            {!couponApplied && (
              <div className="mb-4">
                <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 text-white text-base font-bold px-4 py-2.5 rounded-full shadow-lg animate-pulse hover:animate-none flex items-center justify-center gap-2">
                  <span>
                    Use coupon <span className="font-mono font-extrabold">PREMIUM40</span> for $40 off
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(DISCOUNT_COUPON);
                      toast.success('Coupon code copied to clipboard!');
                    }}
                    className="ml-2 p-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all flex-shrink-0"
                    title="Copy coupon code"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Coupon Code Section */}
            <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center mb-2">
                <Gift className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-sm font-semibold text-yellow-800">Special Offer!</span>
              </div>
              {!couponApplied ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 border border-yellow-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <button
                    onClick={handleCouponApply}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm font-semibold hover:bg-yellow-600 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-700 font-semibold">
                      Coupon {DISCOUNT_COUPON} applied! Save ${DISCOUNT_AMOUNT}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setCouponApplied(false);
                      setCouponCode('');
                      setFinalPrice(PREMIUM_DOLLAR_COST);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-baseline mb-2">
                {couponApplied ? (
                  <>
                    <span className="text-lg text-gray-400 line-through mr-2">${PREMIUM_DOLLAR_COST}</span>
                    <span className="text-3xl font-extrabold text-gray-900">${finalPrice}</span>
                  </>
                ) : (
                  <span className="text-3xl font-extrabold text-gray-900">${PREMIUM_DOLLAR_COST}</span>
                )}
              </div>
              {couponApplied && (
                <div className="text-sm text-green-600 font-semibold">You save ${DISCOUNT_AMOUNT}!</div>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedOption('dollar');
                handleDollarPayment();
              }}
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-semibold transition-all bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Processing...' : `Pay $${finalPrice}`}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Important information</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Premium status is valid for lifetime</li>
                <li>You can earn points by creating content and engaging with the platform</li>
                <li>
                  Use coupon code <span className="font-mono font-semibold">PREMIUM40</span> for $40 discount
                </li>
                <li>All payments are secure and processed instantly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
