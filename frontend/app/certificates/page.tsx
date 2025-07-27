"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast, Toaster } from "sonner";
import { 
  Trash2, 
  Edit, 
  Plus, 
  Save,
  X,
  Award
} from "lucide-react";

interface Certificate {
  _id: string;
  name: string;
  code: string;
  companyId?: string;
  companyName?: string;
  logoUrl?: string;
  pdfFileUrl?: string;
  pdfFileName?: string;
  createdAt: string;
}

interface Company {
  _id: string;
  name: string;
  code: string;
}

interface UserInfo {
  email: string;
  role: string;
  isAdmin: boolean;
}

export default function Certificates() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [filterApplied, setFilterApplied] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [newCertificate, setNewCertificate] = useState({
    name: '',
    code: '',
    companyId: '',
    logoUrl: '',
    pdfFileUrl: '',
    pdfFileName: ''
  });
  const [editCertificate, setEditCertificate] = useState({
    name: '',
    code: '',
    companyId: '',
    logoUrl: '',
    pdfFileUrl: '',
    pdfFileName: ''
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  useEffect(() => {
    const verifyAuth = async () => {
      const res = await fetch('/api/auth/verify');
      if (res.status !== 200) {
        router.push('/'); // Redirect to login page
      }
    };
    verifyAuth();
    fetchCertificates();
    fetchCompanies();
  }, [router]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      } else {
        console.error('Failed to fetch companies');
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  // Filter certificates based on selected company
  const filteredCertificates = certificates.filter(certificate => {
    if (selectedCompanyFilter === 'all') return true;
    return certificate.companyId === selectedCompanyFilter;
  });

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/certificates');
      if (response.ok) {
        const data = await response.json();
        
        // Handle both old format (direct array) and new format (enhanced response)
        if (Array.isArray(data)) {
          // Old format - direct array
          setCertificates(data);
          setUserInfo(null);
          setFilterApplied('');
        } else {
          // New format - enhanced response with user info
          setCertificates(data.certificates || []);
          setUserInfo(data.userInfo || null);
          setFilterApplied(data.filterApplied || '');
        }
        
        setError(null); // Clear any previous errors
      } else {
        // Get the actual error message from the API
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 401) {
          setError('Authentication required. Please log in to view certificates.');
        } else {
          setError(`Failed to fetch certificates: ${errorMessage}`);
        }
        
        console.error('Certificates API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Network error: ${errorMessage}`);
      console.error('Network error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newCertificate.name.trim() || !newCertificate.code.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCertificate),
      });

      if (response.ok) {
        setNewCertificate({ name: '', code: '', companyId: '', logoUrl: '', pdfFileUrl: '', pdfFileName: '' });
        setIsAddingNew(false);
        fetchCertificates();
        setError(null);
        toast.success('Certificate created successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create certificate');
        toast.error('Failed to create certificate');
      }
    } catch (err) {
      setError('Error creating certificate');
      toast.error('Error creating certificate');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editCertificate.name.trim() || !editCertificate.code.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch(`/api/certificates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editCertificate),
      });

      if (response.ok) {
        setEditingId(null);
        setEditCertificate({ name: '', code: '', companyId: '', logoUrl: '', pdfFileUrl: '', pdfFileName: '' });
        fetchCertificates();
        setError(null);
        toast.success('Certificate updated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update certificate');
        toast.error('Failed to update certificate');
      }
    } catch (err) {
      setError('Error updating certificate');
      toast.error('Error updating certificate');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certificate?')) {
      return;
    }

    try {
      const response = await fetch(`/api/certificates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCertificates();
        setError(null);
        toast.success('Certificate deleted successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete certificate');
        toast.error('Failed to delete certificate');
      }
    } catch (err) {
      setError('Error deleting certificate');
      toast.error('Error deleting certificate');
    }
  };

  const startEdit = (certificate: Certificate) => {
    setEditingId(certificate._id);
    setEditCertificate({
      name: certificate.name,
      code: certificate.code,
      companyId: certificate.companyId || '',
      logoUrl: certificate.logoUrl || '',
      pdfFileUrl: certificate.pdfFileUrl || '',
      pdfFileName: certificate.pdfFileName || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCertificate({ name: '', code: '', companyId: '', logoUrl: '', pdfFileUrl: '', pdfFileName: '' });
  };

  const cancelAdd = () => {
    setIsAddingNew(false);
    setNewCertificate({ name: '', code: '', companyId: '', logoUrl: '', pdfFileUrl: '', pdfFileName: '' });
  };

  // File upload function
  const handleFileUpload = async (file: File, isEdit: boolean = false) => {
    if (!file) return null;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return null;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return null;
    }

    setUploadingFile(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/files', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        const updateData = {
          pdfFileUrl: result.fileUrl,
          pdfFileName: file.name
        };

        if (isEdit) {
          setEditCertificate(prev => ({ ...prev, ...updateData }));
        } else {
          setNewCertificate(prev => ({ ...prev, ...updateData }));
        }

        // Show success toast notification
        toast.success(`PDF "${file.name}" uploaded successfully!`);

        // Show a message if this was a mock upload
        if (result.mock) {
          console.log('File uploaded in mock mode - configure Cloudinary credentials for real uploads');
        }

        return result;
      } else {
        setError(result.error || 'Failed to upload file');
        toast.error('Failed to upload PDF file');
        return null;
      }
    } catch (err) {
      setError('Error uploading file');
      toast.error('Error uploading PDF file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pl-16 sm:pl-20 lg:pl-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Award className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Certificate Management</h1>
            </div>
            
            {/* Role and Data Scope Indicators */}
            {userInfo && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge 
                  variant={userInfo.isAdmin ? "default" : "secondary"}
                  className="text-xs"
                >
                  {userInfo.isAdmin ? "Admin" : "User"}: {userInfo.email}
                </Badge>
                {filterApplied && (
                  <Badge variant="outline" className="text-xs">
                    {filterApplied}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button 
            onClick={() => setIsAddingNew(true)}
            disabled={isAddingNew}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Certificate</span>
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Company Filter */}
        <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Label htmlFor="company-filter" className="text-sm font-medium whitespace-nowrap">
              Filter by Company:
            </Label>
            <Select
              value={selectedCompanyFilter}
              onValueChange={(value) => setSelectedCompanyFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select company filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company._id} value={company._id}>
                    {company.name} ({company.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCompanyFilter !== 'all' && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredCertificates.length} of {certificates.length} certificates
              </div>
            )}
          </div>
        </div>

        {/* Add New Certificate Form */}
        {isAddingNew && (
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Add New Certificate</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="new-name">Certificate Name</Label>
                <Input
                  id="new-name"
                  type="text"
                  placeholder="e.g., AWS Certified Solutions Architect"
                  value={newCertificate.name}
                  onChange={(e) => setNewCertificate(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-code">Certificate Code</Label>
                <Input
                  id="new-code"
                  type="text"
                  placeholder="e.g., SAA-C03"
                  value={newCertificate.code}
                  onChange={(e) => setNewCertificate(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-company">Company</Label>
                <Select
                  value={newCertificate.companyId || ""}
                  onValueChange={(value) => setNewCertificate(prev => ({ ...prev, companyId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company._id} value={company._id}>
                        {company.name} ({company.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mb-4">
              <Label htmlFor="new-logo">Certificate Logo (Optional)</Label>
              <Input
                id="new-logo"
                type="text"
                placeholder="Image URL"
                value={newCertificate.logoUrl}
                onChange={(e) => setNewCertificate(prev => ({ ...prev, logoUrl: e.target.value }))}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="new-pdf">Certificate PDF (Optional)</Label>
              <Input
                id="new-pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                disabled={uploadingFile}
              />
              {uploadingFile && <p className="text-sm text-muted-foreground">Uploading file...</p>}
              {newCertificate.pdfFileName && (
                <p className="text-sm text-muted-foreground mt-1">
                  File ready: {newCertificate.pdfFileName}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={handleCreate} 
                disabled={uploadingFile}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{uploadingFile ? 'Uploading...' : 'Save'}</span>
              </Button>
              <Button variant="outline" onClick={cancelAdd} className="flex items-center space-x-2">
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </div>
          </div>
        )}

        {/* Certificates List */}
        <div className="bg-white border rounded-lg shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Certificates ({filteredCertificates.length})</h2>
            <Separator className="mb-4" />
            
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading certificates...</p>
              </div>
            ) : filteredCertificates.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                {selectedCompanyFilter === 'all' ? (
                  <>
                    <p className="text-muted-foreground">No certificates found</p>
                    <p className="text-sm text-muted-foreground mt-2">Add your first certificate to get started</p>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">No certificates found for selected company</p>
                    <p className="text-sm text-muted-foreground mt-2">Try selecting a different company or clear the filter</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCertificates.map((certificate) => (
                  <div key={certificate._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    {editingId === certificate._id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor={`edit-name-${certificate._id}`}>Certificate Name</Label>
                            <Input
                              id={`edit-name-${certificate._id}`}
                              type="text"
                              value={editCertificate.name}
                              onChange={(e) => setEditCertificate(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-code-${certificate._id}`}>Certificate Code</Label>
                            <Input
                              id={`edit-code-${certificate._id}`}
                              type="text"
                              value={editCertificate.code}
                              onChange={(e) => setEditCertificate(prev => ({ ...prev, code: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-company-${certificate._id}`}>Company</Label>
                            <Select
                              value={editCertificate.companyId || ""}
                              onValueChange={(value) => setEditCertificate(prev => ({ ...prev, companyId: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select company" />
                              </SelectTrigger>
                              <SelectContent>
                                {companies.map((company) => (
                                  <SelectItem key={company._id} value={company._id}>
                                    {company.name} ({company.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`edit-logo-${certificate._id}`}>Certificate Logo URL (Optional)</Label>
                          <Input
                            id={`edit-logo-${certificate._id}`}
                            type="text"
                            placeholder="Image URL"
                            value={editCertificate.logoUrl}
                            onChange={(e) => setEditCertificate(prev => ({ ...prev, logoUrl: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`edit-pdf-${certificate._id}`}>Certificate PDF (Optional)</Label>
                          <Input
                            id={`edit-pdf-${certificate._id}`}
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(file, true);
                              }
                            }}
                            disabled={uploadingFile}
                          />
                          {uploadingFile && <p className="text-sm text-muted-foreground">Uploading file...</p>}
                          {editCertificate.pdfFileName && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Current file: {editCertificate.pdfFileName}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-2">
                            {certificate.logoUrl ? (
                              <div className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 flex-shrink-0 mx-auto sm:mx-0">
                                <Image 
                                  src={certificate.logoUrl} 
                                  alt={`${certificate.name} logo`}
                                  width={160}
                                  height={160}
                                  className="w-full h-full object-contain rounded"
                                  onLoad={(e) => {
                                    console.log(`Logo loaded successfully: ${certificate.logoUrl}`);
                                  }}
                                  onError={(e) => {
                                    console.log(`Logo failed to load: ${certificate.logoUrl}`);
                                    // Fallback to default logo if image fails to load
                                    const target = e.currentTarget as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = `
                                      <div class="bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center w-full h-full">
                                        <svg class="text-white w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M9.497 14.25v2.25M16.5 14.25v2.25" />
                                        </svg>
                                      </div>
                                    `;
                                  }}
                                  style={{ 
                                    backgroundColor: '#f8f9fa'
                                  }}
                                />
                              </div>
                            ) : (
                              // Default fallback logo when no URL is provided
                              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 mx-auto sm:mx-0">
                                <Award className="text-white w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16" />
                              </div>
                            )}
                            <div className="text-center sm:text-left">
                              <h3 className="text-lg font-medium mb-2">{certificate.name}</h3>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                <Badge variant="outline">{certificate.code}</Badge>
                                {certificate.companyName && (
                                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                    {certificate.companyName}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Created: {new Date(certificate.createdAt).toISOString().split('T')[0]}
                            </p>
                            {certificate.pdfFileName && certificate.pdfFileUrl && (
                              <p className="text-sm text-muted-foreground">
                                📄 PDF: <a 
                                  href={certificate.pdfFileUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  download={certificate.pdfFileName}
                                  className="text-blue-600 hover:underline"
                                >
                                  {certificate.pdfFileName}
                                </a>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2 mt-4">
                      {editingId === certificate._id ? (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdate(certificate._id)}
                            disabled={uploadingFile}
                            className="flex items-center space-x-1"
                          >
                            <Save className="h-4 w-4" />
                            <span>{uploadingFile ? 'Uploading...' : 'Save'}</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={cancelEdit}
                            className="flex items-center space-x-1"
                          >
                            <X className="h-4 w-4" />
                            <span>Cancel</span>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => startEdit(certificate)}
                            className="flex items-center space-x-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Edit</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDelete(certificate._id)}
                            className="flex items-center space-x-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
