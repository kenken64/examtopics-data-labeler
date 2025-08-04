# AI Agents Feature Implementation

This document describes the implementation of the AI Agents feature in the ExamTopics Data Labeler application.

## Overview

The AI Agents feature allows administrators to manage AI agents that can be used for various tasks like chatbots, assistants, analyzers, and content generators.

## Features Implemented

### 1. Navigation Integration
- Added "AI Agents" menu item to the sliding menu with Bot icon
- Positioned between "Companies" and "Certificates" for logical grouping

### 2. AI Agents Page (`/ai-agents`)
- **Location**: `app/ai-agents/page.tsx`
- **Features**:
  - Lists all AI agents in a responsive card grid
  - Search functionality across name, description, type, model, and capabilities
  - Pagination with configurable page size
  - Admin-only actions (create, edit, delete, activate/deactivate)
  - Status indicators (active, inactive, training)
  - Type badges (chatbot, assistant, analyzer, generator)

### 3. Agent Management
- **Create Agent**: Dialog form with fields for name, description, type, capabilities, and AI model
- **Edit Agent**: Pre-populated form for updating existing agents
- **Delete Agent**: Confirmation dialog before deletion
- **Status Toggle**: Quick activate/deactivate functionality
- **Capabilities Management**: Dynamic list with add/remove functionality

### 4. Agent Types
- **Chatbot**: Interactive conversational agent
- **Assistant**: Task-oriented helper
- **Analyzer**: Data analysis and insights
- **Generator**: Content generation

### 5. Supported AI Models
- GPT-3.5 Turbo
- GPT-4
- Claude-3 Haiku
- Claude-3 Sonnet
- Gemini Pro
- Llama-2 70B

## API Endpoints

### Main Routes (`/api/ai-agents`)
- **GET**: List agents with pagination, search, and filters
- **POST**: Create new agent (admin only)

### Individual Agent Routes (`/api/ai-agents/[id]`)
- **GET**: Get specific agent details
- **PUT**: Update agent (admin only)
- **DELETE**: Delete agent (admin only)

### Status Management (`/api/ai-agents/[id]/status`)
- **PATCH**: Update agent status (admin only)

## Database Schema

### Collection: `ai_agents`

```javascript
{
  _id: ObjectId,
  name: String,           // Unique agent name
  description: String,    // Agent description
  type: String,          // 'chatbot' | 'assistant' | 'analyzer' | 'generator'
  status: String,        // 'active' | 'inactive' | 'training'
  capabilities: [String], // Array of capabilities
  model: String,         // AI model name
  createdAt: Date,
  updatedAt: Date,
  createdBy: String      // User email who created the agent
}
```

### Indexes Created
- `name`: Unique index for agent names
- `type`: Index for filtering by type
- `status`: Index for filtering by status
- `createdAt`: Index for sorting by creation date (descending)
- Text index on `name`, `description`, and `capabilities` for search

## Database Scripts

### Initialization Script
**File**: `scripts/initialize-ai-agents.js`
- Creates necessary indexes
- Seeds sample AI agents if collection is empty
- Sets up the collection structure

### Check Script
**File**: `scripts/check-ai-agents.js`
- Validates collection setup
- Shows collection statistics
- Lists all agents with details
- Tests search functionality

## Security & Authorization

- **Role-based Access Control**: Uses existing RBAC system
- **Admin Only Actions**: Create, edit, delete, and status changes
- **User Filtering**: Regular users see only their data (if applicable)
- **Input Validation**: Server-side validation for all inputs
- **Unique Constraints**: Prevents duplicate agent names

## UI/UX Features

- **Responsive Design**: Works on desktop and mobile
- **Loading States**: Skeleton screens and loading indicators
- **Error Handling**: Toast notifications for errors and success
- **Empty States**: Helpful messages when no agents exist
- **Search Highlighting**: Clear search functionality
- **Status Badges**: Visual indicators for agent status and type
- **Confirmation Dialogs**: Prevents accidental deletions

## Usage Instructions

1. **Access**: Navigate to AI Agents from the sliding menu
2. **View Agents**: Browse the card grid of existing agents
3. **Search**: Use the search bar to find specific agents
4. **Create Agent** (Admin):
   - Click "Add New Agent"
   - Fill in the form fields
   - Add capabilities as needed
   - Submit to create
5. **Edit Agent** (Admin):
   - Click the edit button on any agent card
   - Modify the form fields
   - Submit to update
6. **Toggle Status** (Admin):
   - Click "Activate" or "Deactivate" on agent cards
7. **Delete Agent** (Admin):
   - Click the delete button and confirm

## File Structure

```
app/
├── ai-agents/
│   └── page.tsx                 # Main AI Agents page
├── api/
│   └── ai-agents/
│       ├── route.ts             # List and create agents
│       └── [id]/
│           ├── route.ts         # Get, update, delete agent
│           └── status/
│               └── route.ts     # Update agent status
components/
└── SlidingMenu.tsx              # Updated with AI Agents navigation
scripts/
├── initialize-ai-agents.js      # Database setup script
└── check-ai-agents.js          # Database validation script
```

## Dependencies Used

- **UI Components**: Button, Card, Dialog, Select, Input, Textarea, Badge
- **Icons**: Bot, Plus, Edit, Trash2, Activity, Search
- **Hooks**: useToast for notifications
- **Database**: MongoDB with existing connection utilities
- **Authentication**: Existing auth middleware integration

## Future Enhancements

1. **Agent Interaction**: Chat interface for testing agents
2. **Performance Metrics**: Usage statistics and performance tracking
3. **Training Management**: Interface for training custom models
4. **API Integration**: Connect to actual AI service providers
5. **Agent Templates**: Pre-configured agent templates
6. **Bulk Operations**: Bulk activate/deactivate/delete operations
7. **Export/Import**: Agent configuration backup and restore
8. **Webhooks**: Integration with external systems
9. **Rate Limiting**: Usage limits and quotas
10. **Audit Logs**: Track all agent modifications

## Notes

- The feature follows the existing application patterns and conventions
- All API routes include proper error handling and logging
- The UI is consistent with the existing design system
- Database operations include proper indexing for performance
- The implementation is scalable for future enhancements
