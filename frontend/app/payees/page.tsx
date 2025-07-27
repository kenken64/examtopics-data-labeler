"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Edit, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Certificate {
  _id: string;
  name: string;
  code: string;
  createdAt: string;
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
  email?: string; // Optional email field
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

export default function PayeesPage() {
  const router = useRouter();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingPayee, setIsAddingPayee] = useState(false);
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    certificateId: '',
    payeeName: '',
    creditCardNumber: '',
    expiryDate: '',
    accessCode: '',
    amountPaid: 0,
    status: 'pending',
    email: '', // Add email field
  });

  useEffect(() => {
    const verifyAuth = async () => {
      const res = await fetch('/api/auth/verify');
      if (res.status !== 200) {
        router.push('/'); // Redirect to login page
      }
    };

    const fetchData = async () => {
      try {
        // Fetch payees and certificates in parallel
        const [payeesResponse, certificatesResponse] = await Promise.all([
          fetch(`/api/payees?page=${pagination.currentPage}&limit=${pagination.limit}`),
          fetch('/api/certificates')
        ]);

        if (payeesResponse.ok) {
          const payeesData = await payeesResponse.json();
          setPayees(payeesData.payees || []);
          setPagination(payeesData.pagination || pagination);
        }

        if (certificatesResponse.ok) {
          const certificatesData = await certificatesResponse.json();
          setCertificates(certificatesData.certificates || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data');
      }
    };

    verifyAuth();
    fetchData();
  }, [router, pagination.currentPage, pagination.limit]);

  const fetchPayees = async (page = pagination.currentPage) => {
    try {
      const response = await fetch(`/api/payees?page=${page}&limit=${pagination.limit}`);
      if (response.ok) {
        const data = await response.json();
        setPayees(data.payees || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error('Error fetching payees:', error);
      setError('Failed to load payees');
    }
  };

  const resetForm = () => {
    setFormData({
      certificateId: '',
      payeeName: '',
      creditCardNumber: '',
      expiryDate: '',
      accessCode: '',
      amountPaid: 0,
      status: 'pending',
      email: '', // Add email field to reset
    });
    setEditingPayee(null);
    setIsAddingPayee(false);
    setError(null);
  };

  const handleAddPayee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add payee');
      }

      // Refresh the payees list
      await fetchPayees(pagination.currentPage);

      resetForm();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayee) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payees/${editingPayee._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payee');
      }

      // Refresh the payees list
      await fetchPayees(pagination.currentPage);

      resetForm();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payee?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payees/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete payee');
      }

      // Refresh the payees list
      await fetchPayees(pagination.currentPage);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
  };

  const startEditPayee = (payee: Payee) => {
    setFormData({
      certificateId: payee.certificateId,
      payeeName: payee.payeeName,
      creditCardNumber: payee.creditCardNumber,
      expiryDate: payee.expiryDate,
      accessCode: payee.accessCode,
      amountPaid: payee.amountPaid,
      status: payee.status,
      email: payee.email || '', // Include email field with fallback to empty string
    });
    setEditingPayee(payee);
    setIsAddingPayee(false);
  };

  const getCertificateName = (certificateId: string) => {
    const certificate = certificates.find(cert => cert._id === certificateId);
    return certificate ? `${certificate.name} (${certificate.code})` : 'Unknown Certificate';
  };

  const formatCreditCard = (cardNumber: string) => {
    return `****-****-****-${cardNumber.slice(-4)}`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pl-16 sm:pl-20 lg:pl-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Payee Management</h1>
          <Button 
            onClick={() => setIsAddingPayee(true)}
            className="flex items-center gap-2"
            disabled={isAddingPayee || editingPayee !== null}
          >
            <Plus className="h-4 w-4" />
            Add Payee
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {(isAddingPayee || editingPayee) && (
          <div className="mb-8 p-6 border rounded-lg shadow-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingPayee ? 'Edit Payee' : 'Add New Payee'}
              </h2>
              <Button variant="outline" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={editingPayee ? handleEditPayee : handleAddPayee} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="certificateId">Certificate</Label>
                <Select value={formData.certificateId} onValueChange={(value) => setFormData({ ...formData, certificateId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a certificate" />
                  </SelectTrigger>
                  <SelectContent>
                    {certificates.map((certificate) => (
                      <SelectItem key={certificate._id} value={certificate._id}>
                        {certificate.name} ({certificate.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payeeName">Payee Name</Label>
                <Input
                  id="payeeName"
                  type="text"
                  value={formData.payeeName}
                  onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="creditCardNumber">Credit Card Number</Label>
                <Input
                  id="creditCardNumber"
                  type="text"
                  value={formData.creditCardNumber}
                  onChange={(e) => setFormData({ ...formData, creditCardNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="1234567890123456"
                  maxLength={19}
                  required
                />
              </div>

              <div>
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="text"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  placeholder="MM/YY or MM/YYYY"
                  maxLength={7}
                  required
                />
              </div>

              <div>
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="text"
                  value={formData.accessCode}
                  onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="amountPaid">Amount Paid</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingPayee ? 'Update Payee' : 'Add Payee')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Payees List */}
        <div className="border rounded-lg shadow-md bg-white">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Payees ({pagination.totalCount} total)
              </h2>
              <div className="text-sm text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
            </div>
          </div>

          {payees.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No payees found. Add your first payee to get started.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payee Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Certificate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Card Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payees.map((payee) => (
                      <tr key={payee._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{payee.payeeName}</div>
                          <div className="text-sm text-gray-500">Code: {payee.accessCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getCertificateName(payee.certificateId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCreditCard(payee.creditCardNumber)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payee.expiryDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payee.amountPaid.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(payee.status)}`}>
                            {payee.status.charAt(0).toUpperCase() + payee.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditPayee(payee)}
                              disabled={loading || isAddingPayee || editingPayee !== null}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePayee(payee._id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                      {pagination.totalCount} results
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={!pagination.hasPreviousPage || loading}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>

                      {/* Page numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.currentPage >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === pagination.currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              disabled={loading}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage || loading}
                        className="flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
