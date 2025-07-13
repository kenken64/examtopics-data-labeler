"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Copy, RefreshCw, Link, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Certificate {
  _id: string;
  name: string;
  code: string;
}

interface Payee {
  _id: string;
  certificateId: string;
  payeeName: string;
  creditCardNumber: string;
  expiryDate: string;
  accessCode: string;
  amountPaid: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  email?: string; // Optional email field
  generatedAccessCode?: string;
  accessCodeGenerated?: boolean;
  isLinkedToQuestions?: boolean; // New field to track if questions are linked
}

export default function AccessCodesPage() {
  const router = useRouter();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [linkingFor, setLinkingFor] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const verifyAuth = async () => {
      const res = await fetch('/api/auth/verify');
      if (res.status !== 200) {
        router.push('/'); // Redirect to login page
      }
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch paid payees and certificates in parallel
        const [payeesResponse, certificatesResponse] = await Promise.all([
          fetch('/api/payees?status=paid'),
          fetch('/api/certificates')
        ]);

        if (payeesResponse.ok) {
          const payeesData = await payeesResponse.json();
          // Filter only paid payees
          const paidPayees = (payeesData.payees || payeesData).filter((payee: Payee) => payee.status === 'paid');
          
          // Check which payees have linked questions
          const payeesWithLinkStatus = await Promise.all(
            paidPayees.map(async (payee: Payee) => {
              if (payee.generatedAccessCode) {
                try {
                  const linkCheckResponse = await fetch(`/api/access-code-questions?generatedAccessCode=${encodeURIComponent(payee.generatedAccessCode)}`);
                  // Consider only 200 OK as linked, 404 means no questions assigned yet
                  const isLinked = linkCheckResponse.status === 200;
                  if (linkCheckResponse.status === 404) {
                    // 404 is expected when no questions are assigned yet
                    console.log(`No questions linked yet for access code: ${payee.generatedAccessCode}`);
                  } else if (!linkCheckResponse.ok) {
                    // Log other errors (auth, server errors, etc.)
                    console.warn(`Error checking questions for ${payee.generatedAccessCode}:`, linkCheckResponse.status, linkCheckResponse.statusText);
                  }
                  return { ...payee, isLinkedToQuestions: isLinked };
                } catch (error) {
                  console.warn(`Network error checking questions for ${payee.generatedAccessCode}:`, error);
                  return { ...payee, isLinkedToQuestions: false };
                }
              }
              return { ...payee, isLinkedToQuestions: false };
            })
          );
          
          setPayees(payeesWithLinkStatus);
        }

        if (certificatesResponse.ok) {
          const certificatesData = await certificatesResponse.json();
          setCertificates(certificatesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
    fetchData();
  }, [router]);

  const generateAccessCode = async (payeeId: string) => {
    try {
      setGeneratingFor(payeeId);
      setError(null);

      // Generate a random access code
      const randomCode = `AC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
      
      // Update the payee with the generated access code
      const response = await fetch(`/api/payees/${payeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payees.find(p => p._id === payeeId),
          generatedAccessCode: randomCode,
          accessCodeGenerated: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate access code');
      }

      // Update the local state
      setPayees(prev => prev.map(payee => 
        payee._id === payeeId 
          ? { ...payee, generatedAccessCode: randomCode, accessCodeGenerated: true }
          : payee
      ));

      toast({
        title: "Success",
        description: `Generated access code: ${randomCode}`,
      });

    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingFor(null);
    }
  };

  const linkAccessCodeToQuestions = async (payeeId: string, forceRelink = false) => {
    try {
      setLinkingFor(payeeId);
      setError(null);

      const response = await fetch('/api/link-access-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payeeId,
          forceRelink
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to link access code to questions');
      }

      const result = await response.json();

      // Update the local state
      setPayees(prev => prev.map(payee => 
        payee._id === payeeId 
          ? { ...payee, isLinkedToQuestions: true }
          : payee
      ));

      toast({
        title: "Success",
        description: `Successfully linked ${result.linkedQuestions} questions to access code ${result.accessCode}`,
      });

    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLinkingFor(null);
    }
  };

  const unlinkAccessCodeFromQuestions = async (payeeId: string) => {
    try {
      setLinkingFor(payeeId);
      setError(null);

      const response = await fetch(`/api/link-access-code?payeeId=${payeeId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unlink access code from questions');
      }

      const result = await response.json();

      // Update the local state
      setPayees(prev => prev.map(payee => 
        payee._id === payeeId 
          ? { ...payee, isLinkedToQuestions: false }
          : payee
      ));

      toast({
        title: "Success",
        description: `Successfully unlinked ${result.deletedCount} questions from access code ${result.accessCode}`,
      });

    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message, 
        variant: "destructive",
      });
    } finally {
      setLinkingFor(null);
    }
  };

  const copyToClipboard = async (code: string, payeeId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(payeeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getCertificateName = (certificateId: string) => {
    const certificate = certificates.find(cert => cert._id === certificateId);
    return certificate ? `${certificate.name} (${certificate.code})` : 'Unknown Certificate';
  };

  const formatCreditCard = (cardNumber: string) => {
    return `****-****-****-${cardNumber.slice(-4)}`;
  };

  if (loading && payees.length === 0) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 pl-16 sm:pl-20 lg:pl-24">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Access Codes</h1>
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-4 sm:p-6 lg:p-8 pl-16 sm:pl-20 lg:pl-24">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold">Access Codes</h1>
          <Badge variant="outline" className="text-sm w-fit">
            {payees.length} Paid Customers
          </Badge>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="border rounded-lg shadow-md bg-white">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Paid Customers - Access Code Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate and manage access codes for customers who have completed payment
            </p>
          </div>

          {payees.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No paid customers found. Access codes can only be generated for customers with paid status.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Customer Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px] max-w-[200px]">
                      Certificate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Payment Info
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Original Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                      Generated Access Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Questions Link Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payees.map((payee) => (
                    <tr key={payee._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{payee.payeeName}</div>
                        <div className="text-sm text-gray-500">
                          Card: {formatCreditCard(payee.creditCardNumber)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Expires: {payee.expiryDate}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs break-words">
                          {getCertificateName(payee.certificateId)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          ${payee.amountPaid.toFixed(2)}
                        </div>
                        <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">
                          {payee.status.charAt(0).toUpperCase() + payee.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded break-all max-w-[120px]">
                          {payee.accessCode}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {payee.generatedAccessCode ? (
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-mono bg-blue-100 px-2 py-1 rounded text-blue-800 break-all max-w-[120px]">
                              {payee.generatedAccessCode}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(payee.generatedAccessCode!, payee._id)}
                              className="p-1 h-8 w-8 flex-shrink-0"
                            >
                              {copiedCode === payee._id ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not generated</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {payee.generatedAccessCode ? (
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={payee.isLinkedToQuestions ? "default" : "secondary"}
                              className={payee.isLinkedToQuestions ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                            >
                              {payee.isLinkedToQuestions ? "Linked" : "Not Linked"}
                            </Badge>
                            {payee.isLinkedToQuestions ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unlinkAccessCodeFromQuestions(payee._id)}
                                disabled={linkingFor === payee._id}
                                className="text-red-600 hover:text-red-700"
                              >
                                {linkingFor === payee._id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Unlink className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => linkAccessCodeToQuestions(payee._id)}
                                disabled={linkingFor === payee._id}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                {linkingFor === payee._id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Link className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Button
                          onClick={() => generateAccessCode(payee._id)}
                          disabled={payee.accessCodeGenerated || generatingFor === payee._id}
                          size="sm"
                          className={payee.accessCodeGenerated ? "bg-gray-400" : ""}
                        >
                          {generatingFor === payee._id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : payee.accessCodeGenerated ? (
                            "Generated"
                          ) : (
                            "Generate Code"
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {payees.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Access Code Information</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Access codes can only be generated for customers with "Paid" status</li>
              <li>• Original codes are provided by customers during payment</li>
              <li>• Generated codes are unique system-generated access credentials</li>
              <li>• Once generated, codes cannot be regenerated for security purposes</li>
              <li>• Click the copy button to copy generated codes to clipboard</li>
              <li>• <strong>Link Status:</strong> Shows if the access code is linked to certificate questions</li>
              <li>• <strong>Link/Unlink:</strong> Manually associate or remove question assignments</li>
              <li>• New questions added to certificates are automatically linked to existing access codes</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
