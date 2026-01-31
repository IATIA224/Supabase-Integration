# Supabase Full-Stack Dashboard Application

A professional full-stack web application featuring two separate frontends (Employee & Admin dashboards) and a FastAPI backend, all connected to Supabase PostgreSQL.

## 🏗️ Architecture

```
root/
├── frontend-user/        # Employee dashboard (read-only view)
│   └── React + Vite + Tailwind CSS
│
├── frontend-admin/       # Admin dashboard (full CRUD + CSV)
│   └── React + Vite + Tailwind CSS
│
├── backend/              # FastAPI server
│   └── Python + FastAPI + Supabase
│
├── package.json          # Root scripts for concurrent development
├── .env.example          # Environment variables template
└── README.md
```

## ✨ Features

### Employee Dashboard (frontend-user)
- 📊 View data from Supabase PostgreSQL table
- 🔍 Search functionality across records
- 📄 Pagination with configurable page size
- 🔄 Auto-refresh every 30 seconds
- ↕️ Column sorting (ascending/descending)
- 📱 Fully responsive design

### Admin Dashboard (frontend-admin)
- 📊 Full CRUD operations (Create, Read, Update, Delete)
- 📤 CSV Upload with automatic field mapping
- 📥 CSV Export functionality
- 💾 Supabase storage usage monitoring
- 🗑️ Bulk delete operations
- 📱 Fully responsive design with sidebar navigation

### Backend API
- 🚀 FastAPI with async support
- 📝 RESTful API design
- 📤 CSV parsing and validation
- 📥 CSV export streaming
- 💾 Supabase storage info retrieval
- ⚠️ Comprehensive error handling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Supabase account and project

### 1. Clone and Install Dependencies

```bash
# Install root dependencies and all sub-projects
npm run install:all
```

Or install separately:

```bash
# Root dependencies
npm install

# Frontend User
cd frontend-user && npm install

# Frontend Admin
cd ../frontend-admin && npm install

# Backend
cd ../backend && pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Server Ports
BACKEND_PORT=8000
FRONTEND_USER_PORT=5173
FRONTEND_ADMIN_PORT=5174

# API URL (for frontends)
VITE_API_URL=http://localhost:8000
```

Also create `.env` files in both frontend directories:

**frontend-user/.env** and **frontend-admin/.env**:
```env
VITE_API_URL=http://localhost:8000
```

### 3. Set Up Supabase Database

Create a table in your Supabase project. Example SQL:

```sql
CREATE TABLE records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  title TEXT,
  description TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (for development)
CREATE POLICY "Allow all" ON records FOR ALL USING (true);
```

### 4. Run All Services

```bash
npm run dev
```

This starts:
- **Backend API**: http://localhost:8000
- **Employee Dashboard**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5174

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services concurrently |
| `npm run dev:backend` | Start only the backend server |
| `npm run dev:user` | Start only the employee dashboard |
| `npm run dev:admin` | Start only the admin dashboard |
| `npm run install:all` | Install all dependencies |
| `npm run build:user` | Build employee dashboard for production |
| `npm run build:admin` | Build admin dashboard for production |

## 📤 CSV Upload Usage

### Uploading CSV Files

1. Navigate to the Admin Dashboard
2. Click "CSV Upload" in the sidebar
3. Enter the target table name (default: `records`)
4. Optionally check "Clear existing data" to replace all records
5. Drag & drop or click to select a CSV file
6. Review the preview and column mapping
7. Click "Upload" to import

### CSV Format Guidelines

- Any CSV structure is supported
- Column names are automatically cleaned (lowercase, spaces → underscores)
- `id` and `created_at` columns are auto-generated if not present
- Large files are uploaded in batches of 100 rows

### Example CSV:

```csv
Name,Email,Title,Description,Status
John Doe,john@example.com,Manager,Team lead,Active
Jane Smith,jane@example.com,Developer,Backend engineer,Active
```

## 📥 CSV Export

1. Navigate to the Admin Dashboard
2. Click "Export CSV" button
3. A CSV file with all table data will be downloaded

## 🗄️ Storage Information

The Admin Dashboard displays:
- Total available storage
- Used storage amount
- Remaining storage
- Usage percentage
- List of storage buckets with file counts

## 🔧 API Endpoints

### Data Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data/{table}` | Get paginated records |
| GET | `/api/data/{table}/all` | Get all records |
| GET | `/api/data/{table}/{id}` | Get single record |
| POST | `/api/data/{table}` | Create record |
| PUT | `/api/data/{table}/{id}` | Update record |
| DELETE | `/api/data/{table}/{id}` | Delete record |
| DELETE | `/api/data/{table}` | Delete all records |

### CSV Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/csv/upload/{table}` | Upload CSV file |
| POST | `/api/csv/preview` | Preview CSV file |
| GET | `/api/csv/export/{table}` | Export to CSV |
| POST | `/api/csv/validate` | Validate CSV file |

### Storage Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/storage/info` | Get storage usage info |
| GET | `/api/storage/buckets` | List storage buckets |
| GET | `/api/storage/buckets/{name}/files` | List bucket files |

## 📱 Responsive Design

Both dashboards are fully responsive:
- **Mobile**: Stacked layouts, collapsible menus
- **Tablet**: Adaptive grid layouts
- **Desktop**: Full-featured sidebar navigation

## 🎨 Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client

### Backend
- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **Supabase Python** - Database client
- **Pandas** - CSV processing
- **Pydantic** - Data validation

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use environment variables for all sensitive data
- The service role key has admin access - keep it secure
- Consider implementing authentication for production use

## 📄 License

MIT License
