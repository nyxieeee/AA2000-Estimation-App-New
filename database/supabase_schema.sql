-- ============================================================================
-- AA2000 Estimation App - Supabase Database Schema
-- ============================================================================
-- This SQL file creates all tables, relationships, indexes, and RLS policies
-- for the AA2000 Security and Technology Solutions Inc. Estimation System.
-- 
-- To use: Run this in Supabase SQL Editor or via psql
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- ============================================================================
-- ENUMS / TYPES
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('TECHNICIAN', 'ADMIN', 'SALES', 'MANAGER');

-- File roles for AI scans
CREATE TYPE file_role AS ENUM ('tor', 'technician_proposal', 'floor_plan', 'other');

-- Survey types
CREATE TYPE survey_type AS ENUM ('CCTV', 'FIRE_ALARM', 'FIRE_PROTECTION', 'ACCESS_CONTROL', 'BURGLAR_ALARM', 'OTHER');

-- Project status
CREATE TYPE project_status AS ENUM (
  'Pending', 
  'In Progress', 
  'Finalized', 
  'Finalized - Approved', 
  'Finalized - Rejected',
  'Completed'
);

-- Fee types
CREATE TYPE fee_type AS ENUM (
  'Travel Fee', 
  'Congestion Fee', 
  'Short Notice Fee', 
  'Overtime Fee', 
  'Weekend Fee', 
  'Holiday Fee', 
  'Other'
);

-- Technician response status
CREATE TYPE technician_response_status AS ENUM ('ACCEPTED', 'DECLINED');


-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  employee_id TEXT UNIQUE,
  role user_role DEFAULT 'TECHNICIAN',
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users: Updated at trigger
CREATE OR REPLACE FUNCTION update_users_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at_column();

-- Users: Indexes
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_employee_id ON users(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);


-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_contact_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  location_name TEXT,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  building_type TEXT,
  floors INTEGER,
  building_length DOUBLE PRECISION,
  building_width DOUBLE PRECISION,
  floor_height DOUBLE PRECISION,
  system_types TEXT[], -- e.g., ['CCTV', 'FDAS', 'ACCESS_CONTROL']
  survey_scope TEXT,
  status project_status NOT NULL DEFAULT 'Pending',
  start_date TIMESTAMPTZ,
  technician_name TEXT,
  technician_responses JSONB, -- {"userId": "ACCEPTED" | "DECLINED"}
  completion_date TIMESTAMPTZ,
  finalization JSONB, -- {"actedAt": string, "reviewer": string, "notes": string}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_new_building BOOLEAN DEFAULT FALSE,
  rooms INTEGER,
  total_floor_area DOUBLE PRECISION,
  
  -- Foreign key to user who created the project
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Projects: Updated at trigger
CREATE OR REPLACE FUNCTION update_projects_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at_column();

-- Projects: Indexes
CREATE INDEX idx_projects_client_name ON projects(client_name);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_location ON projects(location);
CREATE INDEX idx_projects_created_at ON projects(created_at);


-- ============================================================================
-- ASSIGNED TECHNICIANS (Junction Table)
-- ============================================================================
CREATE TABLE project_assigned_technicians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, technician_id)
);

-- Assigned Technicians: Indexes
CREATE INDEX idx_project_technicians_project ON project_assigned_technicians(project_id);
CREATE INDEX idx_project_technicians_user ON project_assigned_technicians(technician_id);


-- ============================================================================
-- AI SCAN GROUPS (Folders)
-- ============================================================================
CREATE TABLE ai_scan_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to user who owns this scan group
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- AI Scan Groups: Indexes
CREATE INDEX idx_ai_scan_groups_created_by ON ai_scan_groups(created_by);
CREATE INDEX idx_ai_scan_groups_created_at ON ai_scan_groups(created_at);


-- ============================================================================
-- AI SCAN FILES
-- ============================================================================
CREATE TABLE ai_scan_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size_label TEXT,
  file_size_bytes BIGINT,
  parsed_content TEXT, -- Truncated text content from file parsing
  ai_result JSONB, -- Full AI analysis result (includes auditDetails, estimation, etc.)
  role file_role NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to the scan group this file belongs to
  scan_group_id UUID NOT NULL REFERENCES ai_scan_groups(id) ON DELETE CASCADE
);

-- AI Scan Files: Indexes
CREATE INDEX idx_ai_scan_files_group ON ai_scan_files(scan_group_id);
CREATE INDEX idx_ai_scan_files_role ON ai_scan_files(role);
CREATE INDEX idx_ai_scan_files_created_at ON ai_scan_files(created_at);


-- ============================================================================
-- ESTIMATION MANPOWER ENTRIES
-- ============================================================================
CREATE TABLE estimation_manpower (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL,
  headcount INTEGER NOT NULL DEFAULT 1,
  hours INTEGER NOT NULL DEFAULT 8,
  man_days INTEGER NOT NULL DEFAULT 1,
  day_rate NUMERIC(10, 2) DEFAULT 1000,
  total_cost NUMERIC(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to project
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE
);

-- Estimation Manpower: Updated at trigger
CREATE OR REPLACE FUNCTION update_estimation_manpower_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_estimation_manpower_updated_at ON estimation_manpower;
CREATE TRIGGER update_estimation_manpower_updated_at
  BEFORE UPDATE ON estimation_manpower
  FOR EACH ROW
  EXECUTE FUNCTION update_estimation_manpower_updated_at();

-- Estimation Manpower: Indexes
CREATE INDEX idx_estimation_manpower_project ON estimation_manpower(project_id);


-- ============================================================================
-- ESTIMATION CONSUMABLES ENTRIES
-- ============================================================================
CREATE TABLE estimation_consumables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  srp NUMERIC(10, 2),
  contractor_price NUMERIC(10, 2),
  dealer_price NUMERIC(10, 2),
  product_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to project
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE
);

-- Estimation Consumables: Updated at trigger
CREATE OR REPLACE FUNCTION update_estimation_consumables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_estimation_consumables_updated_at ON estimation_consumables;
CREATE TRIGGER update_estimation_consumables_updated_at
  BEFORE UPDATE ON estimation_consumables
  FOR EACH ROW
  EXECUTE FUNCTION update_estimation_consumables_updated_at();

-- Estimation Consumables: Indexes
CREATE INDEX idx_estimation_consumables_project ON estimation_consumables(project_id);
CREATE INDEX idx_estimation_consumables_category ON estimation_consumables(category);


-- ============================================================================
-- ESTIMATION ADDITIONAL FEES
-- ============================================================================
CREATE TABLE estimation_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_type fee_type NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to project
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE
);

-- Estimation Fees: Updated at trigger
CREATE OR REPLACE FUNCTION update_estimation_fees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_estimation_fees_updated_at ON estimation_fees;
CREATE TRIGGER update_estimation_fees_updated_at
  BEFORE UPDATE ON estimation_fees
  FOR EACH ROW
  EXECUTE FUNCTION update_estimation_fees_updated_at();

-- Estimation Fees: Indexes
CREATE INDEX idx_estimation_fees_project ON estimation_fees(project_id);


-- ============================================================================
-- ESTIMATION SITE CONSTRAINTS
-- ============================================================================
CREATE TABLE estimation_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  physical_constraints JSONB NOT NULL DEFAULT '{}',
  electrical_constraints JSONB NOT NULL DEFAULT '{}',
  installation_constraints JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to project
  project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE
);

-- Estimation Constraints: Updated at trigger
CREATE OR REPLACE FUNCTION update_estimation_constraints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_estimation_constraints_updated_at ON estimation_constraints;
CREATE TRIGGER update_estimation_constraints_updated_at
  BEFORE UPDATE ON estimation_constraints
  FOR EACH ROW
  EXECUTE FUNCTION update_estimation_constraints_updated_at();

-- Estimation Constraints: Indexes
CREATE INDEX idx_estimation_constraints_project ON estimation_constraints(project_id);


-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key to user who should see this notification
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications: Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assigned_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scan_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scan_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimation_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- RLS POLICIES: USERS
-- ============================================================================

-- Users can see their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Admins can see all users
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can manage all users
CREATE POLICY "Admins can manage all users"
  ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );


-- ============================================================================
-- RLS POLICIES: PROJECTS
-- ============================================================================

-- Users can view projects they created or are assigned to
CREATE POLICY "Users can view own and assigned projects"
  ON projects
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_assigned_technicians
      WHERE project_id = projects.id AND technician_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can create projects
CREATE POLICY "Users can create projects"
  ON projects
  FOR INSERT
  WITH CHECK (TRUE);

-- Users can update projects they created
CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can delete projects they created
CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can view all projects
CREATE POLICY "Admins can view all projects"
  ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );


-- ============================================================================
-- RLS POLICIES: PROJECT ASSIGNED TECHNICIANS
-- ============================================================================

-- Users can see their own assignments
CREATE POLICY "Users can view own assignments"
  ON project_assigned_technicians
  FOR SELECT
  USING (
    technician_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_assigned_technicians.project_id
      AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Project creators can assign technicians
CREATE POLICY "Project creators can assign technicians"
  ON project_assigned_technicians
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can remove their own assignment or from their projects
CREATE POLICY "Users can remove own or project assignments"
  ON project_assigned_technicians
  FOR DELETE
  USING (
    technician_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );


-- ============================================================================
-- RLS POLICIES: AI SCAN GROUPS
-- ============================================================================

-- Users can view their own scan groups
CREATE POLICY "Users can view own scan groups"
  ON ai_scan_groups
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can create scan groups
CREATE POLICY "Users can create scan groups"
  ON ai_scan_groups
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Users can update their own scan groups
CREATE POLICY "Users can update own scan groups"
  ON ai_scan_groups
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can delete their own scan groups
CREATE POLICY "Users can delete own scan groups"
  ON ai_scan_groups
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );


-- ============================================================================
-- RLS POLICIES: AI SCAN FILES
-- ============================================================================

-- Users can view files in their scan groups
CREATE POLICY "Users can view files in own scan groups"
  ON ai_scan_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_scan_groups
      WHERE ai_scan_groups.id = scan_group_id
      AND ai_scan_groups.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can create files in their scan groups
CREATE POLICY "Users can create files in own scan groups"
  ON ai_scan_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_scan_groups
      WHERE ai_scan_groups.id = scan_group_id
      AND ai_scan_groups.created_by = auth.uid()
    )
  );

-- Users can update files in their scan groups
CREATE POLICY "Users can update files in own scan groups"
  ON ai_scan_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ai_scan_groups
      WHERE ai_scan_groups.id = scan_group_id
      AND ai_scan_groups.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can delete files from their scan groups
CREATE POLICY "Users can delete files from own scan groups"
  ON ai_scan_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ai_scan_groups
      WHERE ai_scan_groups.id = scan_group_id
      AND ai_scan_groups.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );


-- ============================================================================
-- RLS POLICIES: ESTIMATION TABLES
-- ============================================================================

-- Users can view estimation data for their projects
CREATE POLICY "Users can view estimation data for own projects"
  ON estimation_manpower
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND (projects.created_by = auth.uid()
           OR EXISTS (
             SELECT 1 FROM project_assigned_technicians
             WHERE project_assigned_technicians.project_id = projects.id
             AND project_assigned_technicians.technician_id = auth.uid()
           ))
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Same pattern for consumables, fees, and constraints
CREATE POLICY "Users can view estimation consumables for own projects"
  ON estimation_consumables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND (projects.created_by = auth.uid()
           OR EXISTS (
             SELECT 1 FROM project_assigned_technicians
             WHERE project_assigned_technicians.project_id = projects.id
             AND project_assigned_technicians.technician_id = auth.uid()
           ))
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can view estimation fees for own projects"
  ON estimation_fees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND (projects.created_by = auth.uid()
           OR EXISTS (
             SELECT 1 FROM project_assigned_technicians
             WHERE project_assigned_technicians.project_id = projects.id
             AND project_assigned_technicians.technician_id = auth.uid()
           ))
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can view estimation constraints for own projects"
  ON estimation_constraints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND (projects.created_by = auth.uid()
           OR EXISTS (
             SELECT 1 FROM project_assigned_technicians
             WHERE project_assigned_technicians.project_id = projects.id
             AND project_assigned_technicians.technician_id = auth.uid()
           ))
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Users can create/manage estimation data for their projects
CREATE POLICY "Users can manage estimation data for own projects"
  ON estimation_manpower
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can manage estimation consumables for own projects"
  ON estimation_consumables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can manage estimation fees for own projects"
  ON estimation_fees
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Users can manage estimation constraints for own projects"
  ON estimation_constraints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );


-- ============================================================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (user_id = auth.uid());


-- ============================================================================
-- SUPABASE STORAGE BUCKETS (Optional - for file storage)
-- ============================================================================
-- Uncomment and run these if you want to use Supabase Storage for file uploads

-- Create bucket for project documents
-- CREATE OR REPLACE FUNCTION create_project_documents_bucket()
-- RETURNS VOID AS $$
-- BEGIN
--   PERFORM storage.create_bucket('project_documents');
-- EXCEPTION WHEN OTHERS THEN
--   -- Bucket already exists, that's fine
--   RAISE NOTICE 'Bucket may already exist';
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- SELECT create_project_documents_bucket();
-- DROP FUNCTION IF EXISTS create_project_documents_bucket();


-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment to insert sample data for testing

-- Sample user (admin)
-- INSERT INTO users (id, full_name, email, role) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin@aa2000.com', 'ADMIN');

-- Sample user (technician)
-- INSERT INTO users (id, full_name, email, role) 
-- VALUES ('00000000-0000-0000-0000-000000000002', 'John Technician', 'john@aa2000.com', 'TECHNICIAN');

-- Sample project
-- INSERT INTO projects (id, name, client_name, location, status, created_by) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'DLSU CCTV Upgrade', 'De La Salle University', 'Manila, Philippines', 'In Progress', '00000000-0000-0000-0000-000000000001');


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Application users with roles: TECHNICIAN, ADMIN, SALES, MANAGER';
COMMENT ON TABLE projects IS 'Client projects with detailed specifications and status tracking';
COMMENT ON TABLE project_assigned_technicians IS 'Junction table linking technicians to projects';
COMMENT ON TABLE ai_scan_groups IS 'Folders/groups for organizing AI document scans';
COMMENT ON TABLE ai_scan_files IS 'Individual files uploaded for AI analysis with role classification';
COMMENT ON TABLE estimation_manpower IS 'Labor/manpower entries for project estimations';
COMMENT ON TABLE estimation_consumables IS 'Equipment and consumables for project estimations';
COMMENT ON TABLE estimation_fees IS 'Additional fees (travel, overtime, etc.) for project estimations';
COMMENT ON TABLE estimation_constraints IS 'Site constraints (physical, electrical, installation) for projects';
COMMENT ON TABLE notifications IS 'User notifications for various events';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
