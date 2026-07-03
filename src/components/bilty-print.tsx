import React from 'react';
import { Bilty, GoodsItem } from '../types/supabase';
import { safeFloat } from '../utils/calculations';

interface BiltyPrintProps {
  bilty: Bilty | null;
}

export const BiltyPrint: React.FC<BiltyPrintProps> = ({ bilty }) => {
  if (!bilty) return null;

  const copies = [
    { copyClass: 'copy-white', label: 'Consignor Copy' },
    { copyClass: 'copy-pink', label: 'Consignee Copy' },
    { copyClass: 'copy-yellow', label: 'Driver Copy' },
    { copyClass: 'copy-green', label: 'Counter Copy' }
  ];

  // Helper to format date as DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper to fill goods rows (always render at least 3 rows on print layout)
  const getGoodsRow = (item: GoodsItem | undefined, index: number) => {
    return (
      <tr key={index} className="data-row h-8">
        <td className="col-center">{item?.no || ''}</td>
        <td>{item?.desc || ''}</td>
        <td className="col-right">{item?.weight ? safeFloat(item.weight).toFixed(2) : ''}</td>
        <td className="col-right">{item?.rate ? safeFloat(item.rate).toFixed(2) : ''}</td>
        <td className="col-right">{item?.total ? safeFloat(item.total).toFixed(2) : ''}</td>
        <td>{item?.remarks || ''}</td>
      </tr>
    );
  };

  return (
    <div className="print-copies-container">
      {copies.map((copy, copyIdx) => {
        // Prepare goods items: ensure we have at least 3 array items, filling others with undefined
        const goodsItems = [...(bilty.goods || [])];
        while (goodsItems.length < 3) {
          goodsItems.push({ no: '', desc: '', weight: '', rate: '', total: '', remarks: '' });
        }

        // Additional blank rows for aesthetics (like in the original HTML)
        const emptyRows = Array.from({ length: 4 });

        return (
          <div key={copyIdx} className={`bilty-sheet ${copy.copyClass} mb-12`}>
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
                  <div className="copy-tag">{copy.label}</div>
                </div>
              </div>

              {/* Office Locations */}
              <div className="office-info-bar">
                <div className="office-block border-r border-black">
                  <strong>Reg. Off.:</strong> P-112, MIDC, Tarapur, Boisar, Tal. & Dist. Palghar - 401 506 (Maharashtra).
                </div>
                <div className="office-block">
                  <strong>Br. Off.:</strong> Magdalla Port, Surat - 394270 (Gujarat).<br />
                  <strong>Email:</strong> manojassociates2013@gmail.com
                </div>
              </div>

              {/* Meta details */}
              <div className="meta-info-grid">
                <div className="meta-cell">
                  <span className="meta-label">Bilty No.:</span>
                  <span className="meta-value">{bilty.bilty_no}</span>
                </div>
                <div className="meta-cell">
                  <span className="meta-label">Date:</span>
                  <span className="meta-value">{formatDate(bilty.date)}</span>
                </div>
                <div className="meta-cell">
                  <span className="meta-label">Booking Point:</span>
                  <span className="meta-value">Magdalla Port, Surat</span>
                </div>
              </div>

              {/* Transport Grid */}
              <div className="transport-grid">
                <div className="transport-cell">
                  <strong>Truck No.:</strong> <span className="uppercase">{bilty.truck_no || ''}</span>
                </div>
                <div className="transport-cell">
                  <strong>From:</strong> <span>{bilty.from_location || ''}</span>
                </div>
                <div className="transport-cell">
                  <strong>To:</strong> <span>{bilty.to_location || ''}</span>
                </div>
                <div className="transport-cell">
                  <strong>Driver Name:</strong> <span>{bilty.driver_name || ''}</span>
                </div>
                <div className="transport-cell full-width">
                  <strong>Driver Mob No.:</strong> <span>{bilty.driver_mob || ''}</span>
                </div>
              </div>

              {/* Consigner / Consignee */}
              <div className="party-section">
                <div className="party-box border-r border-black">
                  <div className="party-title">Consigner M/s.</div>
                  <div className="party-name">{bilty.consigner_name || ''}</div>
                  <div className="party-gst">
                    GST No:&nbsp;<span className="font-normal uppercase">{bilty.consigner_gst || ''}</span>
                  </div>
                </div>
                <div className="party-box">
                  <div className="party-title">Consignee M/s.</div>
                  <div className="party-name">{bilty.consignee_name || ''}</div>
                  <div className="party-gst">
                    GST No:&nbsp;<span className="font-normal uppercase">{bilty.consignee_gst || ''}</span>
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
                  {goodsItems.map((item, idx) => getGoodsRow(item, idx))}
                  
                  {/* Empty Spacer Rows */}
                  {emptyRows.map((_, idx) => (
                    <tr key={`empty-${idx}`} className="data-row h-6">
                      <td className="col-center"></td>
                      <td></td>
                      <td className="col-right"></td>
                      <td className="col-right"></td>
                      <td className="col-right"></td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer Calculations & Jurisdiction */}
              <div className="summary-section">
                <div className="terms-jurisdiction">
                  <div>
                    <ul className="terms-list">
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
                    <div className="finance-value">{safeFloat(bilty.to_pay).toFixed(2)}</div>
                  </div>
                  <div className="finance-row">
                    <div className="finance-label">Hamali</div>
                    <div className="finance-value">{safeFloat(bilty.hamali).toFixed(2)}</div>
                  </div>
                  <div className="finance-row">
                    <div className="finance-label">Total</div>
                    <div className="finance-value">{safeFloat(bilty.total_freight).toFixed(2)}</div>
                  </div>
                  <div className="finance-row">
                    <div className="finance-label">Advance</div>
                    <div className="finance-value">{safeFloat(bilty.advance).toFixed(2)}</div>
                  </div>
                  <div className="finance-row border-b-0">
                    <div className="finance-label">Balance of Pay</div>
                    <div className="finance-value text-[13px]">{safeFloat(bilty.balance).toFixed(2)}</div>
                  </div>

                  <div className="signature-area border-t border-black bg-white">
                    <div className="sig-company">For MANOJ ASSOCIATES</div>
                    <div className="sig-line">Authorised Signatory</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
