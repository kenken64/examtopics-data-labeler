"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  createdAt: string;
}

export default function Certificates() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [newCertificate, setNewCertificate] = useState({
    name: '',
    code: ''
  });
  const [editCertificate, setEditCertificate] = useState({
    name: '',
    code: ''
  });

  useEffect(() => {
    const verifyAuth = async () => {
      const res = await fetch('/api/auth/verify');
      if (res.status !== 200) {
        router.push('/'); // Redirect to login page
      }
    };
    verifyAuth();
    fetchCertificates();
  }, [router]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/certificates');
      if (response.ok) {
        const data = await response.json();
        setCertificates(data);
      } else {
        setError('Failed to fetch certificates');
      }
    } catch (err) {
      setError('Error fetching certificates');
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
        setNewCertificate({ name: '', code: '' });
        setIsAddingNew(false);
        fetchCertificates();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create certificate');
      }
    } catch (err) {
      setError('Error creating certificate');
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
        setEditCertificate({ name: '', code: '' });
        fetchCertificates();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update certificate');
      }
    } catch (err) {
      setError('Error updating certificate');
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
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete certificate');
      }
    } catch (err) {
      setError('Error deleting certificate');
    }
  };

  const startEdit = (certificate: Certificate) => {
    setEditingId(certificate._id);
    setEditCertificate({
      name: certificate.name,
      code: certificate.code
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCertificate({ name: '', code: '' });
  };

  const cancelAdd = () => {
    setIsAddingNew(false);
    setNewCertificate({ name: '', code: '' });
  };

  return (
    <div className="min-h-screen p-8 pl-14 sm:pl-16 lg:pl-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Award className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Certificate Management</h1>
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

        {/* Add New Certificate Form */}
        {isAddingNew && (
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Add New Certificate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleCreate} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>Save</span>
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
            <h2 className="text-xl font-semibold mb-4">Certificates ({certificates.length})</h2>
            <Separator className="mb-4" />
            
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading certificates...</p>
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No certificates found</p>
                <p className="text-sm text-muted-foreground mt-2">Add your first certificate to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {certificates.map((certificate) => (
                  <div key={certificate._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    {editingId === certificate._id ? (
                      // Edit mode
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium">{certificate.name}</h3>
                            <Badge variant="outline">{certificate.code}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(certificate.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-2 mt-4">
                      {editingId === certificate._id ? (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdate(certificate._id)}
                            className="flex items-center space-x-1"
                          >
                            <Save className="h-4 w-4" />
                            <span>Save</span>
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
    </div>
  );
}
