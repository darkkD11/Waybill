import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { Bilty, Client, GoodsItem } from '../types/supabase';
import {
  safeFloat,
  calculateRowTotal,
  calculateBiltyPrintTotals,
  calculateWeightDiff,
  calculateDispatchFreight,
  calculateDieselCost,
  calculateDispatchBalances,
} from '../utils/calculations';
import { FileText, Building2, Package, CircleDollarSign, RotateCcw, Printer, Save } from 'lucide-react';

interface BiltyFormProps {
  editBiltyId: string | null;
  onSaveSuccess: () => void;
  onCancelEdit: () => void;
  triggerPrint: (bilty: Bilty) => void;
}

const DEFAULT_GOODS: GoodsItem[] = [
  { no: '', desc: '', weight: '', rate: '', total: '', remarks: '' },
  { no: '', desc: '', weight: '', rate: '', total: '', remarks: '' },
  { no: '', desc: '', weight: '', rate: '', total: '', remarks: '' },
];

export const BiltyForm: React.FC<BiltyFormProps> = ({
  editBiltyId,
  onSaveSuccess,
  onCancelEdit,
  triggerPrint,
}) => {
  // Database datasets
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [biltyNo, setBiltyNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [truckNo, setTruckNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMob, setDriverMob] = useState('');
  const [fromLocation, setFromLocation] = useState('Hazira');
  const [toLocation, setToLocation] = useState('');
  
  // Consigner/Consignee
  const [consignerId, setConsignerId] = useState('');
  const [consignerName, setConsignerName] = useState('');
  const [consignerGst, setConsignerGst] = useState('');
  
  const [consigneeId, setConsigneeId] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [consigneeGst, setConsigneeGst] = useState('');

  // Goods
  const [goods, setGoods] = useState<GoodsItem[]>(JSON.parse(JSON.stringify(DEFAULT_GOODS)));
  const [toPay, setToPay] = useState('0');
  const [hamali, setHamali] = useState('0');
  const [advance, setAdvance] = useState('0');
  
  // Print totals (auto-calculated)
  const [goodsTotal, setGoodsTotal] = useState(0);
  const [totalFreight, setTotalFreight] = useState(0);
  const [balance, setBalance] = useState(0);
  const [copyType, setCopyType] = useState('white');

  // Dispatch Register fields
  const [partyDo, setPartyDo] = useState('');
  const [transporter, setTransporter] = useState('');
  const [material, setMaterial] = useState('Ncoal');
  const [quality, setQuality] = useState('4200');
  const [partyShort, setPartyShort] = useState('');
  const [unloadUnit, setUnloadUnit] = useState('');
  const [challanWt, setChallanWt] = useState('');
  const [recdWt, setRecdWt] = useState('');
  const [wtDiff, setWtDiff] = useState(0);
  const [shortQty, setShortQty] = useState('');
  const [vehicleType, setVehicleType] = useState<'self' | 'outside'>('self');
  const [dispatchRate, setDispatchRate] = useState('');
  const [dispatchFreight, setDispatchFreight] = useState(0);
  const [shortageAmt, setShortageAmt] = useState('');
  const [biltyCharge, setBiltyCharge] = useState('');

  // Self Vehicle fields
  const [vre, setVre] = useState('');
  const [paid, setPaid] = useState('');
  const [fuelLtr, setFuelLtr] = useState('');
  const [pump, setPump] = useState('');
  const [fuelRate, setFuelRate] = useState('');
  const [dieselCost, setDieselCost] = useState(0);
  const [selfBalance, setSelfBalance] = useState(0);

  // Outside Vehicle fields
  const [biltyCom, setBiltyCom] = useState('');
  const [vreAdv, setVreAdv] = useState('');
  const [outFuelLtr, setOutFuelLtr] = useState('');
  const [outDiesel, setOutDiesel] = useState('');
  const [outBalance, setOutBalance] = useState(0);

  // Summaries
  const [advRecd, setAdvRecd] = useState('');
  const [actBalance, setActBalance] = useState(0);

  // Auto-complete suggestions (simple arrays)
  const [truckSuggestions, setTruckSuggestions] = useState<string[]>([]);
  const [driverSuggestions, setDriverSuggestions] = useState<string[]>([]);
  const [transporterSuggestions, setTransporterSuggestions] = useState<string[]>([]);
  const [partySuggestions, setPartySuggestions] = useState<string[]>([]);
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);

  // Load clients and autocompletes
  useEffect(() => {
    fetchClients();
    fetchAutocompletes();
  }, []);

  // Fetch or Auto-increment Bilty Number (only if not editing)
  useEffect(() => {
    if (!editBiltyId) {
      autoIncrementBiltyNumber();
    }
  }, [editBiltyId, date]);

  // Load Bilty details for editing
  useEffect(() => {
    if (editBiltyId) {
      loadBiltyForEdit(editBiltyId);
    }
  }, [editBiltyId]);

  // Real-time calculations: Print totals
  useEffect(() => {
    const rowTotals = goods.map(g => calculateRowTotal(g.weight, g.rate));
    const printTotals = calculateBiltyPrintTotals(rowTotals, toPay, hamali, advance);
    setGoodsTotal(printTotals.goodsTotal);
    setTotalFreight(printTotals.totalFreight);
    setBalance(printTotals.balancePay);
  }, [goods, toPay, hamali, advance]);

  // Real-time calculations: Dispatch weight difference
  useEffect(() => {
    const diff = calculateWeightDiff(challanWt, recdWt);
    setWtDiff(diff);
  }, [challanWt, recdWt]);

  // Real-time calculations: Dispatch freight
  useEffect(() => {
    const freight = calculateDispatchFreight(challanWt, recdWt, dispatchRate);
    setDispatchFreight(freight);
  }, [challanWt, recdWt, dispatchRate]);

  // Real-time calculations: Diesel Cost (self)
  useEffect(() => {
    const cost = calculateDieselCost(fuelLtr, fuelRate);
    setDieselCost(cost);
  }, [fuelLtr, fuelRate]);

  // Real-time calculations: Balances
  useEffect(() => {
    const balances = calculateDispatchBalances({
      vehicleType,
      dispatchFreight,
      shortageAmt,
      biltyCharge,
      vre,
      paid,
      dieselCost,
      biltyCom,
      vreAdv,
      outDiesel,
    });
    setSelfBalance(balances.selfBalance);
    setOutBalance(balances.outBalance);
    setActBalance(balances.actBalance);
  }, [
    vehicleType,
    dispatchFreight,
    shortageAmt,
    biltyCharge,
    vre,
    paid,
    dieselCost,
    biltyCom,
    vreAdv,
    outDiesel,
  ]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setClients(data || []);
    } catch (err: unknown) {
      console.error('Error fetching clients:', err instanceof Error ? err.message : err);
    }
  };

  const fetchAutocompletes = async () => {
    try {
      const { data, error } = await supabase
        .from('biltys')
        .select('truck_no, driver_name, transporter, party_short, from_location, to_location')
        .limit(500);
      
      if (error) throw error;
      if (data) {
        const trucks = new Set<string>();
        const drivers = new Set<string>();
        const transporters = new Set<string>();
        const parties = new Set<string>();
        const froms = new Set<string>();
        const tos = new Set<string>();

        data.forEach(r => {
          if (r.truck_no) trucks.add(r.truck_no.toUpperCase());
          if (r.driver_name) drivers.add(r.driver_name);
          if (r.transporter) transporters.add(r.transporter);
          if (r.party_short) parties.add(r.party_short);
          if (r.from_location) froms.add(r.from_location);
          if (r.to_location) tos.add(r.to_location);
        });

        setTruckSuggestions(Array.from(trucks).sort());
        setDriverSuggestions(Array.from(drivers).sort());
        setTransporterSuggestions(Array.from(transporters).sort());
        setPartySuggestions(Array.from(parties).sort());
        setFromSuggestions(Array.from(froms).sort());
        setToSuggestions(Array.from(tos).sort());
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const autoIncrementBiltyNumber = async () => {
    try {
      const yr = new Date(date).getFullYear();
      const prefix = `MA/${yr}/`;
      
      const { data, error } = await supabase
        .from('biltys')
        .select('bilty_no')
        .like('bilty_no', `${prefix}%`)
        .order('bilty_no', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastNo = data[0].bilty_no;
        const numPart = lastNo.replace(prefix, '');
        const nextInt = parseInt(numPart) + 1;
        setBiltyNo(`${prefix}${String(nextInt).padStart(3, '0')}`);
      } else {
        setBiltyNo(`${prefix}001`);
      }
    } catch (err) {
      console.error('Error auto-incrementing bilty no:', err);
      // Fallback
      const yr = new Date(date).getFullYear();
      setBiltyNo(`MA/${yr}/001`);
    }
  };

  const loadBiltyForEdit = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('biltys')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        const b = data as Bilty;
        setBiltyNo(b.bilty_no);
        setDate(b.date);
        setTruckNo(b.truck_no || '');
        setDriverName(b.driver_name || '');
        setDriverMob(b.driver_mob || '');
        setFromLocation(b.from_location || '');
        setToLocation(b.to_location || '');
        setConsignerId(b.consigner_id || '');
        setConsignerName(b.consigner_name || '');
        setConsignerGst(b.consigner_gst || '');
        setConsigneeId(b.consignee_id || '');
        setConsigneeName(b.consignee_name || '');
        setConsigneeGst(b.consignee_gst || '');
        
        // Goods structure: copy array and pad to 3 rows
        const goodsArr = [...(b.goods || [])];
        while (goodsArr.length < 3) {
          goodsArr.push({ no: '', desc: '', weight: '', rate: '', total: '', remarks: '' });
        }
        setGoods(goodsArr);
        
        setToPay(String(b.to_pay));
        setHamali(String(b.hamali));
        setAdvance(String(b.advance));
        setCopyType(b.copy_type || 'white');
        
        // Dispatch fields
        setPartyDo(b.party_do || '');
        setTransporter(b.transporter || '');
        setMaterial(b.material || 'Ncoal');
        setQuality(b.quality || '4200');
        setPartyShort(b.party_short || '');
        setUnloadUnit(b.unload_unit || '');
        setChallanWt(b.challan_wt ? String(b.challan_wt) : '');
        setRecdWt(b.recd_wt ? String(b.recd_wt) : '');
        setShortQty(b.short_qty ? String(b.short_qty) : '');
        setVehicleType(b.vehicle_type || 'self');
        setDispatchRate(b.dispatch_rate ? String(b.dispatch_rate) : '');
        setBiltyCharge(b.bilty_charge ? String(b.bilty_charge) : '');
        setShortageAmt(b.shortage_amt ? String(b.shortage_amt) : '');
        
        // Self
        setVre(b.vre ? String(b.vre) : '');
        setPaid(b.paid ? String(b.paid) : '');
        setFuelLtr(b.fuel_ltr ? String(b.fuel_ltr) : '');
        setPump(b.pump || '');
        setFuelRate(b.fuel_rate ? String(b.fuel_rate) : '');
        
        // Outside
        setBiltyCom(b.bilty_com ? String(b.bilty_com) : '');
        setVreAdv(b.vre_adv ? String(b.vre_adv) : '');
        setOutFuelLtr(b.out_fuel_ltr ? String(b.out_fuel_ltr) : '');
        setOutDiesel(b.out_diesel ? String(b.out_diesel) : '');
        
        // Summaries
        setAdvRecd(b.adv_recd ? String(b.adv_recd) : '');
      }
    } catch (err: unknown) {
      alert('Error loading bilty: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Smart Autofill Handlers
  const handleTruckBlur = async () => {
    const term = truckNo.trim().toUpperCase();
    if (!term) return;

    try {
      // Find latest entry for this truck to autofill driver details
      const { data, error } = await supabase
        .from('biltys')
        .select('driver_name, driver_mob')
        .eq('truck_no', term)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        const lastEntry = data[0];
        if (lastEntry.driver_name && !driverName) {
          setDriverName(lastEntry.driver_name);
        }
        if (lastEntry.driver_mob && !driverMob) {
          setDriverMob(lastEntry.driver_mob);
        }
      }
    } catch (err) {
      console.error('Error autofilling truck:', err);
    }
  };

  const handleTransporterBlur = async () => {
    const term = transporter.trim();
    if (!term) return;

    try {
      // Find latest party short name for this transporter
      const { data, error } = await supabase
        .from('biltys')
        .select('party_short')
        .eq('transporter', term)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0 && data[0].party_short && !partyShort) {
        setPartyShort(data[0].party_short);
      }
    } catch (err) {
      console.error('Error autofilling transporter:', err);
    }
  };

  const handleRouteBlur = async () => {
    const from = fromLocation.trim();
    const to = toLocation.trim();
    if (!from || !to) return;

    try {
      // Find latest dispatch rate for this route
      const { data, error } = await supabase
        .from('biltys')
        .select('dispatch_rate')
        .eq('from_location', from)
        .eq('to_location', to)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0 && data[0].dispatch_rate && !dispatchRate) {
        setDispatchRate(String(data[0].dispatch_rate));
      }
    } catch (err) {
      console.error('Error autofilling route rate:', err);
    }
  };

  const handleConsignerSelect = (id: string) => {
    setConsignerId(id);
    if (!id) {
      setConsignerName('');
      setConsignerGst('');
      return;
    }
    const c = clients.find(x => x.id === id);
    if (c) {
      setConsignerName(c.name + (c.address ? `, ${c.address}` : ''));
      setConsignerGst(c.gst || '');
    }
  };

  const handleConsigneeSelect = (id: string) => {
    setConsigneeId(id);
    if (!id) {
      setConsigneeName('');
      setConsigneeGst('');
      return;
    }
    const c = clients.find(x => x.id === id);
    if (c) {
      setConsigneeName(c.name + (c.address ? `, ${c.address}` : ''));
      setConsigneeGst(c.gst || '');
      if (c.destination) {
        setToLocation(c.destination);
      }
    }
  };

  // Goods Row Changes
  const handleGoodsChange = (index: number, field: keyof GoodsItem, value: string) => {
    const updated = [...goods];
    updated[index][field] = value;
    
    // Auto-calculate row total if weight or rate changes
    if (field === 'weight' || field === 'rate') {
      const total = calculateRowTotal(updated[index].weight, updated[index].rate);
      updated[index].total = total > 0 ? String(total) : '';
    }
    
    setGoods(updated);
  };

  // Collect states to Bilty model
  const buildBiltyPayload = () => {
    // Filter out blank goods rows, but always keep goods structured array
    const activeGoods = goods.filter(g => g.no || g.desc || g.weight || g.rate);

    return {
      bilty_no: biltyNo,
      date,
      truck_no: truckNo.toUpperCase(),
      driver_name: driverName,
      driver_mob: driverMob,
      from_location: fromLocation,
      to_location: toLocation,
      consigner_id: consignerId || null,
      consigner_name: consignerName,
      consigner_gst: consignerGst.toUpperCase(),
      consignee_id: consigneeId || null,
      consignee_name: consigneeName,
      consignee_gst: consigneeGst.toUpperCase(),
      goods: activeGoods,
      
      // Print financials
      to_pay: safeFloat(toPay),
      hamali: safeFloat(hamali),
      total_freight: goodsTotal + safeFloat(toPay) + safeFloat(hamali),
      advance: safeFloat(advance),
      balance: balance,
      copy_type: copyType,

      // Register fields
      party_do: partyDo,
      transporter,
      material,
      quality,
      party_short: partyShort,
      unload_unit: unloadUnit,
      challan_wt: safeFloat(challanWt),
      recd_wt: safeFloat(recdWt),
      wt_diff: wtDiff,
      short_qty: safeFloat(shortQty),
      vehicle_type: vehicleType,
      dispatch_rate: safeFloat(dispatchRate),
      dispatch_freight: dispatchFreight,
      shortage_amt: safeFloat(shortageAmt),
      bilty_charge: safeFloat(biltyCharge),

      // Self
      vre: safeFloat(vre),
      paid: safeFloat(paid),
      fuel_ltr: safeFloat(fuelLtr),
      pump,
      fuel_rate: safeFloat(fuelRate),
      diesel_cost: dieselCost,
      self_balance: selfBalance,

      // Outside
      bilty_com: safeFloat(biltyCom),
      vre_adv: safeFloat(vreAdv),
      out_fuel_ltr: safeFloat(outFuelLtr),
      out_diesel: safeFloat(outDiesel),
      out_balance: outBalance,

      // Summary
      adv_recd: safeFloat(advRecd),
      act_balance: actBalance,
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biltyNo || !date) {
      alert('Please fill out the Bilty Number and Date.');
      return;
    }

    setLoading(true);
    try {
      const payload = buildBiltyPayload();

      if (editBiltyId) {
        const { error } = await supabase
          .from('biltys')
          .update(payload)
          .eq('id', editBiltyId);
        if (error) throw error;
        alert('Bilty saved successfully!');
      } else {
        const { error } = await supabase
          .from('biltys')
          .insert(payload);
        if (error) throw error;
        alert('Bilty created successfully!');
        resetForm();
      }

      onSaveSuccess();
    } catch (err: unknown) {
      alert('Error saving record: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndPrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biltyNo || !date) {
      alert('Please fill out the Bilty Number and Date.');
      return;
    }

    setLoading(true);
    try {
      const payload = buildBiltyPayload();
      let recordId = editBiltyId;

      if (editBiltyId) {
        const { error } = await supabase
          .from('biltys')
          .update(payload)
          .eq('id', editBiltyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('biltys')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        if (data) recordId = data.id;
      }

      // Query complete row to make sure typings match and pass to print callback
      const { data: savedRow, error: fetchErr } = await supabase
        .from('biltys')
        .select('*')
        .eq('id', recordId)
        .single();

      if (fetchErr) throw fetchErr;

      alert('Bilty saved successfully! Opening Print dialog...');
      
      if (savedRow) {
        // Trigger the print copies layout render and print
        triggerPrint(savedRow as Bilty);
      }

      if (!editBiltyId) resetForm();
      onSaveSuccess();
    } catch (err: unknown) {
      alert('Error printing/saving: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setTruckNo('');
    setDriverName('');
    setDriverMob('');
    setFromLocation('Hazira');
    setToLocation('');
    setConsignerId('');
    setConsignerName('');
    setConsignerGst('');
    setConsigneeId('');
    setConsigneeName('');
    setConsigneeGst('');
    setGoods(JSON.parse(JSON.stringify(DEFAULT_GOODS)));
    setToPay('0');
    setHamali('0');
    setAdvance('0');
    setCopyType('white');
    
    // Dispatch
    setPartyDo('');
    setTransporter('');
    setMaterial('Ncoal');
    setQuality('4200');
    setPartyShort('');
    setUnloadUnit('');
    setChallanWt('');
    setRecdWt('');
    setShortQty('');
    setVehicleType('self');
    setDispatchRate('');
    setBiltyCharge('');
    setShortageAmt('');
    
    // Self
    setVre('');
    setPaid('');
    setFuelLtr('');
    setPump('');
    setFuelRate('');
    
    // Outside
    setBiltyCom('');
    setVreAdv('');
    setOutFuelLtr('');
    setOutDiesel('');
    
    // Summary
    setAdvRecd('');

    if (editBiltyId) {
      onCancelEdit();
    } else {
      autoIncrementBiltyNumber();
    }
  };

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-5 gap-6 p-4">
      {/* LEFT: FORM FIELDS ENTRY (3 Cols on XL) */}
      <div className="xl:col-span-3 space-y-6 max-h-[85vh] overflow-y-auto pr-2 no-print">
        {/* SECTION 1: DOCUMENT INFO & ROUTE */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> 1. Document & Vehicle Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Bilty No.</label>
              <input
                type="text"
                value={biltyNo}
                onChange={e => setBiltyNo(e.target.value)}
                required
                className="w-full text-sm font-semibold border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Truck Number</label>
              <input
                type="text"
                value={truckNo}
                onChange={e => setTruckNo(e.target.value)}
                onBlur={handleTruckBlur}
                placeholder="e.g. GJ16AY9257"
                list="truck_suggestions"
                className="w-full text-sm uppercase border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              />
              <datalist id="truck_suggestions">
                {truckSuggestions.map((t, i) => <option key={i} value={t} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">From</label>
                <input
                  type="text"
                  value={fromLocation}
                  onChange={e => setFromLocation(e.target.value)}
                  onBlur={handleRouteBlur}
                  list="from_suggestions"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="from_suggestions">
                  {fromSuggestions.map((f, i) => <option key={i} value={f} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">To</label>
                <input
                  type="text"
                  value={toLocation}
                  onChange={e => setToLocation(e.target.value)}
                  onBlur={handleRouteBlur}
                  list="to_suggestions"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="to_suggestions">
                  {toSuggestions.map((t, i) => <option key={i} value={t} />)}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Driver Name</label>
              <input
                type="text"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
                list="driver_suggestions"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
              <datalist id="driver_suggestions">
                {driverSuggestions.map((d, i) => <option key={i} value={d} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Driver Mobile</label>
              <input
                type="text"
                value={driverMob}
                onChange={e => setDriverMob(e.target.value)}
                placeholder="10-digit number"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PARTY DETAILS */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" /> 2. Party Details (Consigner & Consignee)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consigner */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-1">Consigner (Sender)</h4>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Select Client</label>
                <select
                  value={consignerId}
                  onChange={e => handleConsignerSelect(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose saved client (Optional) --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Consigner Text</label>
                <textarea
                  value={consignerName}
                  onChange={e => setConsignerName(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Consigner M/s. & Address"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">GST No.</label>
                <input
                  type="text"
                  value={consignerGst}
                  onChange={e => setConsignerGst(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
                  placeholder="GST Number"
                />
              </div>
            </div>

            {/* Consignee */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-800 border-b pb-1">Consignee (Receiver)</h4>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Select Client</label>
                <select
                  value={consigneeId}
                  onChange={e => handleConsigneeSelect(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose saved client (Optional) --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Consignee Text</label>
                <textarea
                  value={consigneeName}
                  onChange={e => setConsigneeName(e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Consignee M/s. & Address"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">GST No.</label>
                <input
                  type="text"
                  value={consigneeGst}
                  onChange={e => setConsigneeGst(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 uppercase font-mono"
                  placeholder="GST Number"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: GOODS DESCRIPTION TABLE */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" /> 3. Goods Details & Print Financials
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase text-left border-b border-slate-200">
                  <th className="px-2 py-2 w-16">Pkgs</th>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2 w-24">Weight</th>
                  <th className="px-2 py-2 w-20">Rate</th>
                  <th className="px-2 py-2 w-24">Total</th>
                  <th className="px-2 py-2">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {goods.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.no}
                        onChange={e => handleGoodsChange(idx, 'no', e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded px-2 py-1 text-center"
                        placeholder="Qty"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.desc}
                        onChange={e => handleGoodsChange(idx, 'desc', e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded px-2 py-1"
                        placeholder="Description"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="any"
                        value={item.weight}
                        onChange={e => handleGoodsChange(idx, 'weight', e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded px-2 py-1 font-mono text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="number"
                        step="any"
                        value={item.rate}
                        onChange={e => handleGoodsChange(idx, 'rate', e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded px-2 py-1 font-mono text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.total}
                        readOnly
                        className="w-full text-sm bg-slate-100 border border-slate-200 rounded px-2 py-1 font-mono text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={e => handleGoodsChange(idx, 'remarks', e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded px-2 py-1"
                        placeholder="Remarks"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t pt-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">To Pay Rs.</label>
              <input
                type="number"
                value={toPay}
                onChange={e => setToPay(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Hamali Rs.</label>
              <input
                type="number"
                value={hamali}
                onChange={e => setHamali(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Advance Rs.</label>
              <input
                type="number"
                value={advance}
                onChange={e => setAdvance(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Copy Highlight</label>
              <select
                value={copyType}
                onChange={e => setCopyType(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="white">Grey / White - Consignor</option>
                <option value="pink">Pink - Consignee</option>
                <option value="yellow">Yellow - Driver</option>
                <option value="green">Green - Counter</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: DISPATCH REGISTER FINANCIALS */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4" /> 4. Dispatch Register Financials
          </h3>
          
          {/* Main Dispatch Fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Party DO No.</label>
              <input
                type="text"
                value={partyDo}
                onChange={e => setPartyDo(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Transporter</label>
              <input
                type="text"
                value={transporter}
                onChange={e => setTransporter(e.target.value)}
                onBlur={handleTransporterBlur}
                list="transporter_suggestions"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
              <datalist id="transporter_suggestions">
                {transporterSuggestions.map((t, i) => <option key={i} value={t} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Material</label>
              <input
                type="text"
                value={material}
                onChange={e => setMaterial(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Quality</label>
              <input
                type="text"
                value={quality}
                onChange={e => setQuality(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Party Short Name</label>
              <input
                type="text"
                value={partyShort}
                onChange={e => setPartyShort(e.target.value)}
                list="party_suggestions"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
              <datalist id="party_suggestions">
                {partySuggestions.map((p, i) => <option key={i} value={p} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Unload Unit</label>
              <input
                type="text"
                value={unloadUnit}
                onChange={e => setUnloadUnit(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Challan Wt (MT)</label>
              <input
                type="number"
                step="any"
                value={challanWt}
                onChange={e => setChallanWt(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Recd Wt (MT)</label>
              <input
                type="number"
                step="any"
                value={recdWt}
                onChange={e => setRecdWt(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Difference (Wt)</label>
              <input
                type="text"
                value={wtDiff.toFixed(2)}
                readOnly
                className="w-full text-sm bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Shortage Qty (Kg)</label>
              <input
                type="number"
                value={shortQty}
                onChange={e => setShortQty(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Dispatch Rate</label>
              <input
                type="number"
                step="any"
                value={dispatchRate}
                onChange={e => setDispatchRate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Dispatch Freight</label>
              <input
                type="text"
                value={dispatchFreight}
                readOnly
                className="w-full text-sm bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-right font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Shortage Amt</label>
              <input
                type="number"
                value={shortageAmt}
                onChange={e => setShortageAmt(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Bilty Charge</label>
              <input
                type="number"
                value={biltyCharge}
                onChange={e => setBiltyCharge(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
          </div>

          {/* Vehicle Type Toggle */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-slate-700">Vehicle Category</span>
              <div className="flex gap-0 border border-slate-300 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setVehicleType('self')}
                  className={`vehicle-type-btn ${vehicleType === 'self' ? 'active' : 'inactive'}`}
                >
                  Self Vehicle
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleType('outside')}
                  className={`vehicle-type-btn ${vehicleType === 'outside' ? 'active' : 'inactive'}`}
                >
                  Outside Vehicle
                </button>
              </div>
            </div>

            {/* Conditionally Renders Forms based on Self vs Outside */}
            {vehicleType === 'self' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">VRE</label>
                  <input
                    type="number"
                    value={vre}
                    onChange={e => setVre(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Paid</label>
                  <input
                    type="number"
                    value={paid}
                    onChange={e => setPaid(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Fuel (Ltr)</label>
                  <input
                    type="number"
                    step="any"
                    value={fuelLtr}
                    onChange={e => setFuelLtr(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Pump Name</label>
                  <input
                    type="text"
                    value={pump}
                    onChange={e => setPump(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Fuel Rate</label>
                  <input
                    type="number"
                    step="any"
                    value={fuelRate}
                    onChange={e => setFuelRate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Diesel Cost</label>
                  <input
                    type="text"
                    value={dieselCost}
                    readOnly
                    className="w-full text-sm bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div className="col-span-2 md:col-span-3 border-t pt-3 mt-1 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Calculated Self Balance:</span>
                  <span className="text-lg font-bold text-indigo-600 font-mono">₹{selfBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Bilty Comm.</label>
                  <input
                    type="number"
                    value={biltyCom}
                    onChange={e => setBiltyCom(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">VRE Adv.</label>
                  <input
                    type="number"
                    value={vreAdv}
                    onChange={e => setVreAdv(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Fuel Ltr</label>
                  <input
                    type="number"
                    step="any"
                    value={outFuelLtr}
                    onChange={e => setOutFuelLtr(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Outside Diesel</label>
                  <input
                    type="number"
                    value={outDiesel}
                    onChange={e => setOutDiesel(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
                  />
                </div>
                <div className="col-span-2 md:col-span-4 border-t pt-3 mt-1 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">Calculated Outside Balance:</span>
                  <span className="text-lg font-bold text-indigo-600 font-mono">₹{outBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Summaries */}
          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Advance Received Rs.</label>
              <input
                type="number"
                value={advRecd}
                onChange={e => setAdvRecd(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Actual Balance Rs.</label>
              <input
                type="text"
                value={actBalance.toLocaleString('en-IN')}
                readOnly
                className="w-full text-sm bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-right font-mono font-bold text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 border-t pt-4">
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-semibold transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-100 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {editBiltyId ? 'Update Record' : 'Save Bilty'}
          </button>
          
          <button
            type="button"
            disabled={loading}
            onClick={handleSaveAndPrint}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-100 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Save & Print (4 Copies)
          </button>
        </div>
      </div>

      {/* RIGHT: LIVE BILTY PREVIEW (2 Cols on XL) */}
      <div className="xl:col-span-2 flex flex-col items-center justify-start bg-slate-200 border border-slate-300 rounded-xl p-4 overflow-y-auto max-h-[85vh] shadow-inner no-print">
        <h3 className="text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-3 w-full border-b pb-2 flex justify-between">
          <span>Live Bilty Document Preview</span>
          <span className="text-indigo-600">Copy Highlight: {copyType}</span>
        </h3>
        
        {/* Render a replica of the Bilty inside the screen wrapper */}
        <div className="bilty-preview-wrapper shadow-2xl">
          <div className={`bilty-sheet copy-${copyType} screen-only-bilty`}>
            <div className="bilty-border-box">
              {/* Header */}
              <div className="bilty-header">
                <div className="header-left-logo">🚚</div>
                <div className="header-center-title">
                  <div className="company-name">MANOJ ASSOCIATES</div>
                  <div className="company-subtitle">TRANSPORT CONTRACTOR & COMMISSION AGENT</div>
                </div>
                <div className="header-right-meta">
                  <div>PAN No.: ABDFM4490N</div>
                  <div className="mt-1">Mob.: 9725560557, 9765351200</div>
                  <div className="copy-tag">
                    {copyType === 'white' && 'Consignor Copy'}
                    {copyType === 'pink' && 'Consignee Copy'}
                    {copyType === 'yellow' && 'Driver Copy'}
                    {copyType === 'green' && 'Counter Copy'}
                  </div>
                </div>
              </div>

              {/* Office Locations */}
              <div className="office-info-bar">
                <div className="office-block border-r border-black">
                  <strong>Reg. Off.:</strong> P-112, MIDC, Tarapur, Boisar, Tal. & Dist. Palghar - 401 506 (Maharashtra).
                </div>
                <div className="office-block font-normal">
                  <strong>Br. Off.:</strong> Magdalla Port, Surat - 394270 (Gujarat).<br />
                  <strong>Email:</strong> manojassociates2013@gmail.com
                </div>
              </div>

              {/* Meta details */}
              <div className="meta-info-grid">
                <div className="meta-cell">
                  <span className="meta-label">Bilty No.:</span>
                  <span className="meta-value">{biltyNo || '-'}</span>
                </div>
                <div className="meta-cell">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{date ? date.split('-').reverse().join('/') : '-'}</span>
                </div>
                <div className="meta-cell">
                  <span className="meta-label">Booking Point:</span>
                  <span className="meta-value">Magdalla Port, Surat</span>
                </div>
              </div>

              {/* Transport Grid */}
              <div className="transport-grid">
                <div className="transport-cell">
                  <strong>Truck No.:</strong> <span className="uppercase">{truckNo || '-'}</span>
                </div>
                <div className="transport-cell">
                  <strong>From:</strong> <span>{fromLocation || '-'}</span>
                </div>
                <div className="transport-cell">
                  <strong>To:</strong> <span>{toLocation || '-'}</span>
                </div>
                <div className="transport-cell">
                  <strong>Driver Name:</strong> <span>{driverName || '-'}</span>
                </div>
                <div className="transport-cell full-width">
                  <strong>Driver Mob No.:</strong> <span>{driverMob || '-'}</span>
                </div>
              </div>

              {/* Consigner / Consignee */}
              <div className="party-section">
                <div className="party-box border-r border-black">
                  <div className="party-title">Consigner M/s.</div>
                  <div className="party-name text-xs leading-snug">{consignerName || '-'}</div>
                  <div className="party-gst">
                    GST No:&nbsp;<span className="font-normal uppercase">{consignerGst || '-'}</span>
                  </div>
                </div>
                <div className="party-box">
                  <div className="party-title">Consignee M/s.</div>
                  <div className="party-name text-xs leading-snug">{conconsigneeLabelText(consigneeName)}</div>
                  <div className="party-gst">
                    GST No:&nbsp;<span className="font-normal uppercase">{consigneeGst || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Goods Table */}
              <table className="goods-table">
                <thead>
                  <tr className="border-b border-black">
                    <th style={{ width: '12%' }}>No. of Pkgs</th>
                    <th style={{ width: '43%' }}>Description of Goods</th>
                    <th style={{ width: '13%' }}>Weight</th>
                    <th style={{ width: '10%' }}>Rate</th>
                    <th style={{ width: '12%' }}>Total Freight</th>
                    <th style={{ width: '10%' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {goods.map((item, idx) => (
                    <tr key={idx} className="data-row h-7">
                      <td className="col-center font-semibold">{item.no || ''}</td>
                      <td>{item.desc || ''}</td>
                      <td className="col-right">{item.weight ? safeFloat(item.weight).toFixed(2) : ''}</td>
                      <td className="col-right">{item.rate ? safeFloat(item.rate).toFixed(2) : ''}</td>
                      <td className="col-right font-semibold">{item.total ? safeFloat(item.total).toFixed(2) : ''}</td>
                      <td>{item.remarks || ''}</td>
                    </tr>
                  ))}
                  <tr className="data-row h-6"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  <tr className="data-row h-6"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  <tr className="data-row h-6"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                  <tr className="data-row h-6"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                </tbody>
              </table>

              {/* Summary calculations */}
              <div className="summary-section">
                <div className="terms-jurisdiction font-normal">
                  <div>
                    <ul className="terms-list text-[10px]">
                      <li>Shortage allowed 200 kg. only.</li>
                      <li>Service Tax will be paid by consignee.</li>
                      <li>Subject to Surat Jurisdiction only.</li>
                    </ul>
                  </div>
                  <div className="text-[10px] font-bold mt-2">
                    GSTIN: 27ABDFM4490N1ZQ
                  </div>
                </div>

                <div className="finance-block">
                  <div className="finance-row">
                    <div className="finance-label">To Pay Rs.</div>
                    <div className="finance-value">{safeFloat(toPay).toFixed(2)}</div>
                  </div>
                  <div className="finance-row">
                    <div className="finance-label">Hamali</div>
                    <div className="finance-value">{safeFloat(hamali).toFixed(2)}</div>
                  </div>
                  <div className="finance-row">
                    <div className="finance-label">Total</div>
                    <div className="finance-value">{totalFreight.toFixed(2)}</div>
                  </div>
                  <div className="finance-row">
                    <div className="finance-label">Advance</div>
                    <div className="finance-value">{safeFloat(advance).toFixed(2)}</div>
                  </div>
                  <div className="finance-row border-b-0">
                    <div className="finance-label">Balance of Pay</div>
                    <div className="finance-value text-[13px]">{balance.toFixed(2)}</div>
                  </div>

                  <div className="signature-area border-t border-black bg-white flex-grow">
                    <div className="sig-company text-[10px] font-bold">For MANOJ ASSOCIATES</div>
                    <div className="sig-line text-[9px] font-bold mt-4">Authorised Signatory</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

// Simple helper to avoid rendering raw undefined consignee name in preview
const conconsigneeLabelText = (val: string) => {
  return val || '-';
};
