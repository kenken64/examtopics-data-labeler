"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Bot,
  Settings,
  Activity,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIAgent {
  _id: string;
  name: string;
  description: string;
  type: 'chatbot' | 'assistant' | 'analyzer' | 'generator';
  status: 'active' | 'inactive' | 'training';
  capabilities: string[];
  model: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface AIAgentFormData {
  name: string;
  description: string;
  type: 'chatbot' | 'assistant' | 'analyzer' | 'generator';
  capabilities: string[];
  model: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalAgents: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
}

interface UserInfo {
  email: string;
  role: string;
  isAdmin: boolean;
}

interface AIAgentsResponse {
  agents: AIAgent[];
  pagination: Pagination;
  userInfo?: UserInfo;
  filterApplied?: string;
}

export default function AIAgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalAgents: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 10
  });
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [formData, setFormData] = useState<AIAgentFormData>({
    name: '',
    description: '',
    type: 'chatbot',
    capabilities: [],
    model: 'gpt-3.5-turbo'
  });
  const [newCapability, setNewCapability] = useState('');

  const { toast } = useToast();

  // Available AI models
  const availableModels = [
    'gpt-3.5-turbo',
    'gpt-4',
    'claude-3-haiku',
    'claude-3-sonnet',
    'gemini-pro',
    'llama-2-70b'
  ];

  // Available agent types
  const agentTypes = [
    { value: 'chatbot', label: 'Chatbot', description: 'Interactive conversational agent' },
    { value: 'assistant', label: 'Assistant', description: 'Task-oriented helper' },
    { value: 'analyzer', label: 'Analyzer', description: 'Data analysis and insights' },
    { value: 'generator', label: 'Generator', description: 'Content generation' }
  ];

  useEffect(() => {
    fetchAgents();
  }, [pagination.currentPage, searchTerm]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/ai-agents?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch AI agents');
      }

      const data: AIAgentsResponse = await response.json();
      setAgents(data.agents);
      setPagination(data.pagination);
      setUserInfo(data.userInfo || null);
    } catch (error) {
      console.error('Error fetching AI agents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI agents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchAgents();
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/ai-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create AI agent');
      }

      toast({
        title: "Success",
        description: "AI agent created successfully!",
      });

      setIsAddDialogOpen(false);
      resetForm();
      fetchAgents();
    } catch (error) {
      console.error('Error creating AI agent:', error);
      toast({
        title: "Error",
        description: "Failed to create AI agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    try {
      const response = await fetch(`/api/ai-agents/${editingAgent._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update AI agent');
      }

      toast({
        title: "Success",
        description: "AI agent updated successfully!",
      });

      setIsEditDialogOpen(false);
      setEditingAgent(null);
      resetForm();
      fetchAgents();
    } catch (error) {
      console.error('Error updating AI agent:', error);
      toast({
        title: "Error",
        description: "Failed to update AI agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this AI agent?')) return;

    try {
      const response = await fetch(`/api/ai-agents/${agentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete AI agent');
      }

      toast({
        title: "Success",
        description: "AI agent deleted successfully!",
      });

      fetchAgents();
    } catch (error) {
      console.error('Error deleting AI agent:', error);
      toast({
        title: "Error",
        description: "Failed to delete AI agent. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(`/api/ai-agents/${agentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent status');
      }

      toast({
        title: "Success",
        description: `AI agent ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`,
      });

      fetchAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
      toast({
        title: "Error",
        description: "Failed to update agent status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description,
      type: agent.type,
      capabilities: agent.capabilities,
      model: agent.model
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'chatbot',
      capabilities: [],
      model: 'gpt-3.5-turbo'
    });
    setNewCapability('');
  };

  const addCapability = () => {
    if (newCapability.trim() && !formData.capabilities.includes(newCapability.trim())) {
      setFormData(prev => ({
        ...prev,
        capabilities: [...prev.capabilities, newCapability.trim()]
      }));
      setNewCapability('');
    }
  };

  const removeCapability = (capability: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.filter(c => c !== capability)
    }));
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'training': return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'chatbot': return 'default';
      case 'assistant': return 'secondary';
      case 'analyzer': return 'outline';
      case 'generator': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground animate-pulse mb-4" />
            <p className="text-lg font-medium">Loading AI Agents...</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch your agents</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Agents
          </h1>
          <p className="text-muted-foreground">
            Manage your AI agents and their capabilities
          </p>
        </div>
        
        {userInfo?.isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New AI Agent</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAgent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Agent Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter agent name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Agent Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent type" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this agent does"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Capabilities</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newCapability}
                      onChange={(e) => setNewCapability(e.target.value)}
                      placeholder="Add a capability"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                    />
                    <Button type="button" onClick={addCapability} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.capabilities.map((capability, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeCapability(capability)}
                      >
                        {capability} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Agent</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search AI agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No AI Agents Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm 
                ? "No agents match your search criteria. Try adjusting your search terms."
                : "You haven't created any AI agents yet. Create your first agent to get started."
              }
            </p>
            {!searchTerm && userInfo?.isAdmin && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Agent
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Card key={agent._id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={getStatusBadgeVariant(agent.status)}>
                      {agent.status}
                    </Badge>
                    <Badge variant={getTypeBadgeVariant(agent.type)}>
                      {agent.type}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {agent.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">MODEL</p>
                    <Badge variant="outline">{agent.model}</Badge>
                  </div>
                  
                  {agent.capabilities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">CAPABILITIES</p>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.slice(0, 3).map((capability, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {capability}
                          </Badge>
                        ))}
                        {agent.capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{agent.capabilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">CREATED</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(agent.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>

              {userInfo?.isAdmin && (
                <CardFooter className="pt-0">
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(agent._id, agent.status)}
                      className="flex-1"
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      {agent.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(agent)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAgent(agent._id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalAgents)} of{' '}
                {pagination.totalAgents} agents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={!pagination.hasPreviousPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit AI Agent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateAgent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Agent Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter agent name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Agent Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent type" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this agent does"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-model">AI Model</Label>
              <Select
                value={formData.model}
                onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Capabilities</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  placeholder="Add a capability"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                />
                <Button type="button" onClick={addCapability} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {formData.capabilities.map((capability, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeCapability(capability)}
                  >
                    {capability} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Agent</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"{"step1": "Use AWS Glue crawlers to infer the schemas and available columns.", "step2": "Use AWS Glue DataBrew for data cleaning and feature engineering.", "step3": "Store the resulting data back in Amazon S3."}"