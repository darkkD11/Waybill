export interface GoodsItem {
  no: string;
  desc: string;
  weight: string;
  rate: string;
  total: string;
  remarks: string;
}

export interface Client {
  id: string;
  name: string;
  address: string | null;
  gst: string | null;
  contact: string | null;
  destination: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bilty {
  id: string;
  bilty_no: string;
  date: string;
  truck_no: string | null;
  driver_name: string | null;
  driver_mob: string | null;
  from_location: string | null;
  to_location: string | null;
  consigner_id: string | null;
  consigner_name: string | null;
  consigner_gst: string | null;
  consignee_id: string | null;
  consignee_name: string | null;
  consignee_gst: string | null;
  
  // Goods is an array of up to 3 GoodsItem
  goods: GoodsItem[];
  
  // Print Financials
  to_pay: number;
  hamali: number;
  total_freight: number;
  advance: number;
  balance: number;
  copy_type: string;
  
  // Dispatch register columns
  party_do: string | null;
  transporter: string | null;
  material: string;
  quality: string;
  party_short: string | null;
  unload_unit: string | null;
  challan_wt: number;
  recd_wt: number;
  wt_diff: number;
  short_qty: number;
  vehicle_type: 'self' | 'outside';
  dispatch_rate: number;
  dispatch_freight: number;
  shortage_amt: number;
  bilty_charge: number;
  
  // Self vehicle fields
  vre: number;
  paid: number;
  fuel_ltr: number;
  pump: string | null;
  fuel_rate: number;
  diesel_cost: number;
  self_balance: number;
  
  // Outside vehicle fields
  bilty_com: number;
  vre_adv: number;
  out_fuel_ltr: number;
  out_diesel: number;
  out_balance: number;
  
  // Summaries
  adv_recd: number;
  act_balance: number;
  
  created_at: string;
  updated_at: string;
}

export type NewClient = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type NewBilty = Omit<Bilty, 'id' | 'created_at' | 'updated_at'>;
