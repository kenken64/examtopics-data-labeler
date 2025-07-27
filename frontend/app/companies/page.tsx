"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Company {
  _id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
}

interface CompanyFormData {
  name: string;
  code: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCompanies: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
}

interface UserInfo {
  email: string;
  role: string;
  isAdmin: boolean;
}

interface CompaniesResponse {
  companies: Company[];
  pagination: Pagination;
  userInfo?: UserInfo;
  filterApplied?: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [filterApplied, setFilterApplied] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<CompanyFormData>({ name: '', code: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCompanies = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search })
      });
      
      const response = await fetch(`/api/companies?${params}`);
      if (!response.ok) throw new Error('Failed to fetch companies');
      
      const data: CompaniesResponse = await response.json();
      setCompanies(data.companies);
      setPagination(data.pagination);
      setUserInfo(data.userInfo || null);
      setFilterApplied(data.filterApplied || '');
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies(currentPage, searchTerm);
  }, [currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCompanies(1, searchTerm);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setFormLoading(true);
      setError('');
      
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create company');
      }

      setFormData({ name: '', code: '' });
      setIsCreateModalOpen(false);
      fetchCompanies(currentPage, searchTerm);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany || !formData.name.trim() || !formData.code.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setFormLoading(true);
      setError('');
      
      const response = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: editingCompany._id,
          ...formData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update company');
      }

      setFormData({ name: '', code: '' });
      setEditingCompany(null);
      setIsEditModalOpen(false);
      fetchCompanies(currentPage, searchTerm);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Are you sure you want to delete "${company.name}"?`)) return;

    try {
      const response = await fetch(`/api/companies?id=${company._id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete company');
      }

      fetchCompanies(currentPage, searchTerm);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({ name: company.name, code: company.code });
    setError('');
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({ name: '', code: '' });
    setError('');
    setIsCreateModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6 relative">
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-bold">Companies Management</h1>
              {userInfo && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-blue-700">
                      <strong>User:</strong> {userInfo.email}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      userInfo.isAdmin 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {userInfo.role.toUpperCase()}
                    </span>
                    <span className="text-blue-600">
                      <strong>View:</strong> {filterApplied}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={openCreateModal} className="flex items-center gap-2 absolute right-0">
              <Plus size={16} />
              Add Company
            </Button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Search companies by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          {/* Companies Table */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No companies found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Company Name</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Code</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Created</th>
                      <th className="border border-gray-200 px-4 py-2 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company._id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2">{company.name}</td>
                        <td className="border border-gray-200 px-4 py-2 font-mono">{company.code}</td>
                        <td className="border border-gray-200 px-4 py-2">
                          {new Date(company.createdAt).toLocaleDateString()}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(company)}
                              className="flex items-center gap-1"
                            >
                              <Edit size={14} />
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCompany(company)}
                              className="flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalCompanies)} of{' '}
                    {pagination.totalCompanies} companies
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!pagination.hasPreviousPage}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft size={14} />
                      Previous
                    </Button>
                    <span className="flex items-center px-3 py-1 text-sm">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Create Company Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">Company Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Enter company code"
                  required
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Create Company'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Company Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Company</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditCompany} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Company Name</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-code">Company Code</Label>
                <Input
                  id="edit-code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Enter company code"
                  required
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Updating...' : 'Update Company'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}