-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create CLIENTS table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    gst TEXT,
    contact TEXT,
    destination TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing clients name and gst for searches
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_gst ON clients (gst);

-- Create BILTYS table
CREATE TABLE IF NOT EXISTS biltys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bilty_no TEXT NOT NULL UNIQUE,
    date DATE NOT NULL,
    truck_no TEXT,
    driver_name TEXT,
    driver_mob TEXT,
    from_location TEXT,
    to_location TEXT,
    consigner_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    consigner_name TEXT,
    consigner_gst TEXT,
    consignee_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    consignee_name TEXT,
    consignee_gst TEXT,
    
    -- Goods details (JSONB array containing up to 3 goods items: {no, desc, weight, rate, total, remarks})
    goods JSONB DEFAULT '[]'::jsonb,
    
    -- Print financials
    to_pay NUMERIC(12, 2) DEFAULT 0,
    hamali NUMERIC(12, 2) DEFAULT 0,
    total_freight NUMERIC(12, 2) DEFAULT 0,
    advance NUMERIC(12, 2) DEFAULT 0,
    balance NUMERIC(12, 2) DEFAULT 0,
    copy_type TEXT DEFAULT 'white',
    
    -- Dispatch register financials
    party_do TEXT,
    transporter TEXT,
    material TEXT DEFAULT 'Ncoal',
    quality TEXT DEFAULT '4200',
    party_short TEXT,
    unload_unit TEXT,
    challan_wt NUMERIC(12, 2) DEFAULT 0,
    recd_wt NUMERIC(12, 2) DEFAULT 0,
    wt_diff NUMERIC(12, 2) DEFAULT 0,
    short_qty NUMERIC(12, 2) DEFAULT 0,
    vehicle_type TEXT DEFAULT 'self', -- 'self' or 'outside'
    dispatch_rate NUMERIC(12, 2) DEFAULT 0,
    dispatch_freight NUMERIC(12, 2) DEFAULT 0,
    shortage_amt NUMERIC(12, 2) DEFAULT 0,
    bilty_charge NUMERIC(12, 2) DEFAULT 0,
    
    -- Self vehicle fields
    vre NUMERIC(12, 2) DEFAULT 0,
    paid NUMERIC(12, 2) DEFAULT 0,
    fuel_ltr NUMERIC(12, 2) DEFAULT 0,
    pump TEXT,
    fuel_rate NUMERIC(12, 2) DEFAULT 0,
    diesel_cost NUMERIC(12, 2) DEFAULT 0,
    self_balance NUMERIC(12, 2) DEFAULT 0,
    
    -- Outside vehicle fields
    bilty_com NUMERIC(12, 2) DEFAULT 0,
    vre_adv NUMERIC(12, 2) DEFAULT 0,
    out_fuel_ltr NUMERIC(12, 2) DEFAULT 0,
    out_diesel NUMERIC(12, 2) DEFAULT 0,
    out_balance NUMERIC(12, 2) DEFAULT 0,
    
    -- Summary columns
    adv_recd NUMERIC(12, 2) DEFAULT 0,
    act_balance NUMERIC(12, 2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing biltys for frequent searches and filters
CREATE INDEX IF NOT EXISTS idx_biltys_no ON biltys (bilty_no);
CREATE INDEX IF NOT EXISTS idx_biltys_date ON biltys (date);
CREATE INDEX IF NOT EXISTS idx_biltys_truck ON biltys (truck_no);
CREATE INDEX IF NOT EXISTS idx_biltys_driver ON biltys (driver_name);
CREATE INDEX IF NOT EXISTS idx_biltys_transporter ON biltys (transporter);
CREATE INDEX IF NOT EXISTS idx_biltys_consigner ON biltys (consigner_id);
CREATE INDEX IF NOT EXISTS idx_biltys_consignee ON biltys (consignee_id);

-- Triggers for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_modtime
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_biltys_modtime
    BEFORE UPDATE ON biltys
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
