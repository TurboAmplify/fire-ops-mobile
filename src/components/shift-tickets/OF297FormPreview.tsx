import { X } from "lucide-react";
import type { ShiftTicket, EquipmentEntry, PersonnelEntry } from "@/services/shift-tickets";
import { SignedImage } from "@/components/ui/SignedImage";

interface OF297FormPreviewProps {
  ticket: Partial<ShiftTicket>;
  contractorSigUrl: string | null;
  supervisorSigUrl: string | null;
  supervisorName: string;
  supervisorRO: string;
  onSupervisorNameChange: (v: string) => void;
  onSupervisorROChange: (v: string) => void;
  onTapToSign: () => void;
  onClearSignature: () => void;
  onClose: () => void;
  uploadingSig: boolean;
}

const cellClass = "border border-black px-1.5 py-1 text-[10px] text-black";
const headerCellClass = "border border-black px-1.5 py-0.5 text-[9px] font-bold text-black bg-gray-100 uppercase";

export function OF297FormPreview({
  ticket,
  contractorSigUrl,
  supervisorSigUrl,
  supervisorName,
  supervisorRO,
  onSupervisorNameChange,
  onSupervisorROChange,
  onTapToSign,
  onClearSignature,
  onClose,
  uploadingSig,
}: OF297FormPreviewProps) {
  const equipment = (ticket.equipment_entries || []) as EquipmentEntry[];
  const personnel = (ticket.personnel_entries || []) as PersonnelEntry[];

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Close button */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-black px-3 py-2">
        <span className="text-xs font-bold text-black">OF-297 Review</span>
        <button onClick={onClose} className="p-2 touch-target">
          <X className="h-5 w-5 text-black" />
        </button>
      </div>

      <div className="p-3 space-y-0 max-w-2xl mx-auto">
        {/* Form Title */}
        <div className="text-center border border-black px-2 py-1.5">
          <p className="text-[10px] font-bold text-black uppercase">Emergency Equipment Shift Ticket</p>
          <p className="text-[8px] text-black">OF-297</p>
        </div>

        {/* Header Fields */}
        <div className="grid grid-cols-2 -mt-px">
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">1. Agreement/Contract #</span>
            {ticket.agreement_number || ""}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">2. Contractor Name</span>
            {ticket.contractor_name || ""}
          </div>
        </div>
        <div className="grid grid-cols-3 -mt-px">
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">3. Resource Order #</span>
            {ticket.resource_order_number || ""}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">4. Incident Name</span>
            {ticket.incident_name || ""}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">5. Incident #</span>
            {ticket.incident_number || ""}
          </div>
        </div>

        {/* Equipment Info */}
        <div className="grid grid-cols-4 -mt-px">
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">7. Make/Model</span>
            {ticket.equipment_make_model || ""}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">8. Type</span>
            {ticket.equipment_type || ""}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">9. Serial/VIN</span>
            {ticket.serial_vin_number || ""}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">10. License/ID</span>
            {ticket.license_id_number || ""}
          </div>
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-4 -mt-px">
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">6. Financial Code</span>
            {ticket.financial_code || ""}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">12. Transport Retained</span>
            {ticket.transport_retained ? "Yes" : "No"}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">13. First/Last</span>
            {ticket.is_first_last ? (ticket.first_last_type === "mobilization" ? "Mobilization" : "Demobilization") : "No"}
          </div>
          <div className={cellClass}>
            <span className="text-[8px] font-bold block">14. Miles</span>
            {ticket.miles ?? ""}
          </div>
        </div>

        {/* Equipment Table */}
        <div className="-mt-px">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={headerCellClass}>15. Date</th>
                <th className={headerCellClass}>16. Start</th>
                <th className={headerCellClass}>17. Stop</th>
                <th className={headerCellClass}>18. Total</th>
                <th className={headerCellClass}>19. Qty</th>
                <th className={headerCellClass}>20. Type</th>
                <th className={headerCellClass}>21. Remarks</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length > 0 ? equipment.map((e, i) => (
                <tr key={i}>
                  <td className={cellClass}>{e.date}</td>
                  <td className={cellClass}>{e.start}</td>
                  <td className={cellClass}>{e.stop}</td>
                  <td className={cellClass}>{e.total}</td>
                  <td className={cellClass}>{e.quantity}</td>
                  <td className={cellClass}>{e.type}</td>
                  <td className={cellClass}>{e.remarks}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className={cellClass + " text-center text-gray-400"}>No entries</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Personnel Table */}
        <div className="-mt-px">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={headerCellClass}>22. Date</th>
                <th className={headerCellClass}>23. Name</th>
                <th className={headerCellClass}>24. Start</th>
                <th className={headerCellClass}>25. Stop</th>
                <th className={headerCellClass}>26. Start</th>
                <th className={headerCellClass}>27. Stop</th>
                <th className={headerCellClass}>28. Total</th>
                <th className={headerCellClass}>29. Remarks</th>
              </tr>
            </thead>
            <tbody>
              {personnel.length > 0 ? personnel.map((p, i) => (
                <tr key={i}>
                  <td className={cellClass}>{p.date}</td>
                  <td className={cellClass}>{p.operator_name}</td>
                  <td className={cellClass}>{p.op_start}</td>
                  <td className={cellClass}>{p.op_stop}</td>
                  <td className={cellClass}>{p.sb_start}</td>
                  <td className={cellClass}>{p.sb_stop}</td>
                  <td className={cellClass}>{p.total}</td>
                  <td className={cellClass}>{p.remarks}</td>
                </tr>
              )) : (
                <tr><td colSpan={8} className={cellClass + " text-center text-gray-400"}>No entries</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Remarks */}
        <div className={cellClass + " -mt-px min-h-[40px]"}>
          <span className="text-[8px] font-bold block">30. Remarks</span>
          {ticket.remarks || ""}
        </div>

        {/* Signatures Section */}
        <div className="grid grid-cols-2 -mt-px">
          {/* Contractor */}
          <div className={cellClass + " space-y-1"}>
            <span className="text-[8px] font-bold block">31. Contractor Rep</span>
            <p className="text-[10px]">{ticket.contractor_rep_name || ""}</p>
            <span className="text-[8px] font-bold block">32. Signature</span>
            {contractorSigUrl ? (
              <SignedImage src={contractorSigUrl} alt="Contractor signature" className="h-10 max-w-full object-contain" />
            ) : (
              <div className="h-10 border-b border-black" />
            )}
          </div>

          {/* Supervisor */}
          <div className={cellClass + " space-y-1"}>
            <span className="text-[8px] font-bold block">33. Incident Supervisor</span>
            <input
              type="text"
              value={supervisorName}
              onChange={(e) => onSupervisorNameChange(e.target.value)}
              placeholder="Name"
              className="w-full border border-gray-300 rounded px-1.5 py-1.5 text-[11px] text-black bg-white outline-none focus:ring-1 focus:ring-blue-400"
            />
            <input
              type="text"
              value={supervisorRO}
              onChange={(e) => onSupervisorROChange(e.target.value)}
              placeholder="Resource Order #"
              className="w-full border border-gray-300 rounded px-1.5 py-1.5 text-[11px] text-black bg-white outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-[8px] font-bold block">34. Signature</span>
            {supervisorSigUrl ? (
              <div className="space-y-1">
                <SignedImage src={supervisorSigUrl} alt="Supervisor signature" className="h-10 max-w-full object-contain" />
                <button onClick={onClearSignature} className="text-[10px] text-red-600 touch-target">Clear</button>
              </div>
            ) : (
              <button
                onClick={onTapToSign}
                disabled={uploadingSig || !supervisorName.trim()}
                className="w-full border-2 border-dashed border-gray-400 rounded py-4 text-[11px] text-gray-500 touch-target disabled:opacity-40 active:bg-gray-50"
              >
                {!supervisorName.trim()
                  ? "Enter supervisor name above to sign"
                  : "Tap to sign"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom padding for safe area */}
      <div className="h-20" />
    </div>
  );
}
